import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  streamText,
  tool,
  stepCountIs,
  type ModelMessage,
} from 'ai';
import { z } from 'zod';
import { ASSISTANT_SYSTEM_PROMPT } from './systemPrompt.ts';
import {
  runGetCities,
  runGetStations,
  runSearchTrips,
  runGetTripDetails,
  runGetAvailableSeats,
  runGetBookingInfo,
} from './tools/executeTools.ts';
import {
  getCitiesInputSchema,
  getStationsInputSchema,
  searchTripsInputSchema,
  getTripDetailsInputSchema,
  getAvailableSeatsInputSchema,
  getBookingInfoInputSchema,
} from './tools/schemas.ts';

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const MAX_STEPS = Number(process.env.AI_MAX_TOOL_STEPS ?? '5');
const MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? '1024');

function requireApiKey(): string {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }
  return key;
}

export function isAssistantEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY,
  );
}

function buildTools(conversationId: string) {
  return {
    getCities: tool({
      description:
        'List available cities on Rihla. Optional name filter (Arabic or English).',
      inputSchema: getCitiesInputSchema,
      execute: async (input) => runGetCities(input),
    }),
    getStations: tool({
      description:
        'List stations for a city. Provide cityId or cityName.',
      inputSchema: getStationsInputSchema,
      execute: async (input) => runGetStations(input),
    }),
    searchTrips: tool({
      description:
        'Search published upcoming trips. Provide origin and destination (name or id) and a date or relativeDate. Optional time window and sort.',
      inputSchema: searchTripsInputSchema,
      execute: async (input) => runSearchTrips(input, conversationId),
    }),
    getTripDetails: tool({
      description:
        'Get public details for a trip UUID returned by searchTrips.',
      inputSchema: getTripDetailsInputSchema,
      execute: async (input) => runGetTripDetails(input, conversationId),
    }),
    getAvailableSeats: tool({
      description:
        'Get current public seat availability counts for a trip UUID.',
      inputSchema: getAvailableSeatsInputSchema,
      execute: async (input) => runGetAvailableSeats(input),
    }),
    getBookingInfo: tool({
      description:
        'Answer booking, cancellation, payment, refund, or hold-time policy questions.',
      inputSchema: getBookingInfoInputSchema,
      execute: async (input) => runGetBookingInfo(input),
    }),
  };
}

const historyMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
});

export const assistantRequestSchema = z.object({
  messages: z.array(historyMessageSchema).min(1).max(20),
  conversationId: z.string().uuid().optional(),
  locale: z.enum(['ar', 'en']).optional(),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

/** Cap history sent to the model to control free-tier usage. */
function trimHistory(
  messages: AssistantRequest['messages'],
): ModelMessage[] {
  const max = Number(process.env.AI_MAX_HISTORY_MESSAGES ?? '8');
  const sliced = messages.slice(-max);
  return sliced.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export async function streamAssistantReply(
  request: AssistantRequest,
  options: { abortSignal?: AbortSignal } = {},
) {
  const apiKey = requireApiKey();
  const google = createGoogleGenerativeAI({ apiKey });
  const conversationId =
    request.conversationId ?? crypto.randomUUID();

  const result = streamText({
    model: google(DEFAULT_MODEL),
    system: ASSISTANT_SYSTEM_PROMPT,
    messages: trimHistory(request.messages),
    tools: buildTools(conversationId),
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: options.abortSignal,
    temperature: 0.3,
  });

  return { result, conversationId };
}
