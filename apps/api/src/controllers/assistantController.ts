import type { Request, Response } from 'express';
import { pipeUIMessageStreamToResponse, type UIMessageChunk } from 'ai';
import { z } from 'zod';
import { AppError } from '../errors/AppError.ts';
import { sendFailure } from '../utils/apiResponse.ts';
import { readAccessToken } from '../utils/sessionTokens.ts';
import {
  assistantRequestSchema,
  assistantErrorCode,
  assistantModel,
  assistantTimeoutMs,
  isAssistantEnabled,
  streamAssistantReply,
} from '../ai/assistantService.ts';

const incomingRequestSchema = z.object({
  messages: z.array(z.unknown()).min(1).max(100),
  conversationId: z.uuid().optional(),
  selectedTripId: z.uuid().optional(),
  locale: z.enum(['ar', 'en']).optional(),
});
const incomingMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000).optional(),
  parts: z.array(z.unknown()).max(200).optional(),
});
const textPartSchema = z.object({
  type: z.literal('text'),
  text: z.string().max(4000),
});

async function conversationOwner(request: Request) {
  const session = z.uuid().safeParse(request.get('X-Assistant-Session'));
  if (!session.success)
    throw new AppError(400, 'VALIDATION_ERROR', 'Assistant session required');
  const authorization = request.get('Authorization');
  if (!authorization) return 'anonymous:' + session.data;
  const token = authorization.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token || token.length > 4096)
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid session');
  try {
    const claims = await readAccessToken(token);
    return 'session:' + claims.sessionId + ':' + session.data;
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid session');
  }
}

// A tool may still be finishing a read after cancellation; do not hold the HTTP stream open.
function withRequestDeadline(
  source: ReadableStream<UIMessageChunk>,
  signal: AbortSignal,
  deadline: AbortSignal,
) {
  const reader = source.getReader();
  let closed = false;
  let notifyAbort = () => {};
  const aborted = new Promise<null>((resolve) => {
    notifyAbort = () => resolve(null);
  });
  signal.addEventListener('abort', notifyAbort, { once: true });
  if (signal.aborted) notifyAbort();
  const cancel = () => {
    closed = true;
    signal.removeEventListener('abort', notifyAbort);
    void reader
      .cancel()
      .catch(() => {})
      .finally(() => reader.releaseLock());
  };
  return new ReadableStream<UIMessageChunk>({
    async pull(controller) {
      try {
        const next = await Promise.race([reader.read(), aborted]);
        if (closed) return;
        if (
          next === null ||
          (!next.done && next.value.type === 'abort' && signal.aborted)
        ) {
          if (deadline.aborted)
            controller.enqueue({
              type: 'error',
              errorText: 'ASSISTANT_TIMEOUT',
            });
          controller.close();
          cancel();
        } else if (next.done) {
          closed = true;
          signal.removeEventListener('abort', notifyAbort);
          reader.releaseLock();
          controller.close();
        } else controller.enqueue(next.value);
      } catch (error) {
        if (closed) return;
        controller.enqueue({
          type: 'error',
          errorText: assistantErrorCode(error),
        });
        controller.close();
        cancel();
      }
    },
    cancel,
  });
}

export function createAssistantController() {
  return {
    async chat(request: Request, response: Response) {
      response.setHeader('Cache-Control', 'no-store');
      if (!isAssistantEnabled()) {
        sendFailure(response, 503, 'ASSISTANT_UNAVAILABLE');
        return;
      }
      const ownerId = await conversationOwner(request);
      const incoming = incomingRequestSchema.safeParse(request.body);
      if (!incoming.success)
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Invalid assistant request',
        );

      const messages: { role: 'user' | 'assistant'; content: string }[] = [];
      for (const raw of incoming.data.messages.slice(-20)) {
        const parsed = incomingMessageSchema.safeParse(raw);
        if (!parsed.success)
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid message');
        const message = parsed.data;
        const content =
          message.content ??
          (message.parts ?? [])
            .map((part) => {
              if (
                !part ||
                typeof part !== 'object' ||
                !('type' in part) ||
                part.type !== 'text'
              )
                return '';
              const text = textPartSchema.safeParse(part);
              if (!text.success)
                throw new AppError(
                  400,
                  'VALIDATION_ERROR',
                  'Invalid text part',
                );
              return text.data.text;
            })
            .join('');
        if (content.trim()) messages.push({ role: message.role, content });
      }
      const parsed = assistantRequestSchema.safeParse({
        ...incoming.data,
        messages,
      });
      if (!parsed.success || parsed.data.messages.at(-1)?.role !== 'user') {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'A user message is required',
        );
      }
      if (
        parsed.data.messages.reduce(
          (total, message) => total + message.content.length,
          0,
        ) > 12000
      ) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Message payload too large',
        );
      }

      const disconnected = new AbortController();
      const deadline = AbortSignal.timeout(assistantTimeoutMs);
      const signal = AbortSignal.any([disconnected.signal, deadline]);
      const onClose = () => {
        if (!response.writableEnded) disconnected.abort();
      };
      response.on('close', onClose);
      try {
        const { result, conversationId } = await streamAssistantReply(
          parsed.data,
          { ownerId, abortSignal: signal },
        );
        const stream = withRequestDeadline(
          result.toUIMessageStream({
            onError: assistantErrorCode,
            sendReasoning: false,
          }),
          signal,
          deadline,
        );
        await pipeUIMessageStreamToResponse({
          response,
          stream,
          headers: {
            'X-Conversation-Id': conversationId,
            'Cache-Control': 'no-store',
          },
        });
      } catch (error) {
        if (disconnected.signal.aborted) return;
        if (response.headersSent) {
          response.destroy();
          return;
        }
        const code = deadline.aborted
          ? 'ASSISTANT_TIMEOUT'
          : assistantErrorCode(error);
        sendFailure(
          response,
          code === 'AI_RATE_LIMIT'
            ? 429
            : code === 'ASSISTANT_TIMEOUT'
              ? 504
              : 503,
          code,
        );
      } finally {
        response.off('close', onClose);
      }
    },
    status(_request: Request, response: Response) {
      response.setHeader('Cache-Control', 'no-store');
      response.json({
        success: true,
        code: 'OK',
        message: 'ok',
        data: { enabled: isAssistantEnabled(), model: assistantModel },
      });
    },
  };
}
