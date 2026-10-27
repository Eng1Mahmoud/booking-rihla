import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, tool, stepCountIs, type ModelMessage } from 'ai';
import { z } from 'zod';
import { ASSISTANT_SYSTEM_PROMPT } from './systemPrompt.ts';
import { getFilters, updateFilters } from './context/conversationState.ts';
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

function boundedSetting(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name] ?? fallback);
  return Number.isSafeInteger(value) && value >= 1 && value <= maximum
    ? value
    : fallback;
}

export const assistantModel =
  process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
export const assistantRateLimit = boundedSetting(
  'AI_RATE_LIMIT_PER_MINUTE',
  20,
  1000,
);
export const assistantTimeoutMs = boundedSetting(
  'AI_REQUEST_TIMEOUT_MS',
  30000,
  120000,
);
const MAX_STEPS = boundedSetting('AI_MAX_TOOL_STEPS', 5, 10);
const MAX_OUTPUT_TOKENS = boundedSetting('AI_MAX_OUTPUT_TOKENS', 1024, 4096);
const MAX_HISTORY_MESSAGES = boundedSetting('AI_MAX_HISTORY_MESSAGES', 8, 20);

export function assistantErrorCode(error: unknown): string {
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? error.statusCode
      : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (status === 429 || /resource.?exhausted|quota|429/.test(message))
    return 'AI_RATE_LIMIT';
  if (
    status === 404 ||
    status === 400 ||
    /not found|not configured|unsupported model/.test(message)
  )
    return 'ASSISTANT_UNAVAILABLE';
  return 'ASSISTANT_ERROR';
}

function requireApiKey(): string {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY;
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
      description: 'List stations for a city. Provide cityId or cityName.',
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
        'Get public details for a trip UUID returned by searchTrips; omit tripId to inspect the currently selected trip.',
      inputSchema: getTripDetailsInputSchema,
      execute: async (input) => runGetTripDetails(input, conversationId),
    }),
    getAvailableSeats: tool({
      description:
        'Get current public seat availability; omit tripId to inspect the currently selected trip.',
      inputSchema: getAvailableSeatsInputSchema,
      execute: async (input) => runGetAvailableSeats(input, conversationId),
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
  content: z.string().trim().min(1).max(4000),
});

export const assistantRequestSchema = z.object({
  messages: z.array(historyMessageSchema).min(1).max(20),
  conversationId: z.string().uuid().optional(),
  selectedTripId: z.uuid().optional(),
  locale: z.enum(['ar', 'en']).optional(),
});

export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

/** Cap history sent to the model to control free-tier usage. */
function trimHistory(messages: AssistantRequest['messages']): ModelMessage[] {
  const sliced = messages.slice(-MAX_HISTORY_MESSAGES);
  while (sliced[0]?.role === 'assistant') sliced.shift();
  return sliced.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export async function streamAssistantReply(
  request: AssistantRequest,
  options: { ownerId: string; abortSignal?: AbortSignal },
) {
  const apiKey = requireApiKey();
  const google = createGoogleGenerativeAI({ apiKey });
  const conversationId = request.conversationId ?? crypto.randomUUID();

  const contextKey = options.ownerId + ':' + conversationId;
  if (request.selectedTripId)
    updateFilters(contextKey, { selectedTripId: request.selectedTripId });
  const selectedTripId = getFilters(contextKey)?.selectedTripId;
  const system =
    ASSISTANT_SYSTEM_PROMPT +
    (selectedTripId
      ? '\nSelected public trip UUID: ' +
        selectedTripId +
        '. Use the trip tools to validate it and obtain current details when the user refers to this trip.'
      : '');

  const result = streamText({
    model: google(assistantModel),
    system,
    messages: trimHistory(request.messages),
    tools: buildTools(contextKey),
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: options.abortSignal,
    temperature: 0.3,
    maxRetries: 0,
    onError: () => {},
  });

  return { result, conversationId };
}
