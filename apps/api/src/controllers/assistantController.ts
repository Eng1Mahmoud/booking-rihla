import type { Request, Response } from 'express';
import { AppError } from '../errors/AppError.ts';
import {
  assistantRequestSchema,
  isAssistantEnabled,
  streamAssistantReply,
} from '../ai/assistantService.ts';

export function createAssistantController() {
  return {
    async chat(request: Request, response: Response) {
      if (!isAssistantEnabled()) {
        throw new AppError(
          503,
          'ASSISTANT_UNAVAILABLE',
          'AI assistant is not configured',
        );
      }

      // DefaultChatTransport sends { messages: UIMessage[], ... }
      // Normalize to simple role/content pairs for the model.
      const body = request.body as {
        messages?: unknown;
        conversationId?: string;
        locale?: string;
      };

      const normalizedMessages: { role: 'user' | 'assistant'; content: string }[] =
        [];
      if (Array.isArray(body.messages)) {
        for (const m of body.messages) {
          if (!m || typeof m !== 'object') continue;
          const msg = m as {
            role?: string;
            content?: string;
            parts?: { type?: string; text?: string }[];
          };
          if (msg.role !== 'user' && msg.role !== 'assistant') continue;
          let content = '';
          if (typeof msg.content === 'string') content = msg.content;
          else if (Array.isArray(msg.parts)) {
            content = msg.parts
              .filter((p) => p.type === 'text' && p.text)
              .map((p) => p.text!)
              .join('');
          }
          if (content) {
            normalizedMessages.push({
              role: msg.role,
              content: content.slice(0, 4000),
            });
          }
        }
      }

      const parsed = assistantRequestSchema.safeParse({
        messages: normalizedMessages,
        conversationId: body.conversationId,
        locale: body.locale,
      });
      if (!parsed.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid assistant request: messages (1-20) required',
        );
      }

      const totalChars = parsed.data.messages.reduce(
        (n, m) => n + m.content.length,
        0,
      );
      if (totalChars > 12000) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Message payload too large',
        );
      }

      const abort = new AbortController();
      request.on('close', () => {
        if (!response.writableEnded) abort.abort();
      });

      try {
        const { result, conversationId } = await streamAssistantReply(
          parsed.data,
          { abortSignal: abort.signal },
        );

        response.setHeader('X-Conversation-Id', conversationId);
        response.setHeader('Cache-Control', 'no-store');

        const streamResponse = result.toUIMessageStreamResponse({
          headers: {
            'X-Conversation-Id': conversationId,
          },
        });

        response.status(streamResponse.status);
        streamResponse.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'transfer-encoding') return;
          response.setHeader(key, value);
        });

        if (!streamResponse.body) {
          response.end();
          return;
        }

        const reader = streamResponse.body.getReader();
        const pump = async (): Promise<void> => {
          const { done, value } = await reader.read();
          if (done) {
            response.end();
            return;
          }
          if (value) response.write(Buffer.from(value));
          await pump();
        };
        await pump();
      } catch (error) {
        if (abort.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : 'Assistant error';
        if (
          message.includes('429') ||
          message.toLowerCase().includes('resource exhausted') ||
          message.toLowerCase().includes('quota')
        ) {
          throw new AppError(
            429,
            'AI_RATE_LIMIT',
            'AI quota exceeded. Use the normal search form.',
          );
        }
        if (message.includes('not configured')) {
          throw new AppError(
            503,
            'ASSISTANT_UNAVAILABLE',
            'AI assistant is not configured',
          );
        }
        throw error;
      }
    },

    status(_request: Request, response: Response) {
      response.setHeader('Cache-Control', 'no-store');
      response.json({
        success: true,
        code: 'OK',
        message: 'ok',
        data: {
          enabled: isAssistantEnabled(),
          model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-lite',
        },
      });
    },
  };
}
