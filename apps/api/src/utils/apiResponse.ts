import type { Response } from 'express';
import { apiMessages } from '../config/apiMessages.ts';

function message(response: Response, code: string) {
  const languages = response.req.acceptsLanguages();
  const preferred = languages
    .map((value) => value.toLowerCase().split('-')[0])
    .find((value) => value === 'ar' || value === 'en');
  response.vary('Accept-Language');
  return (apiMessages[code] ?? apiMessages['REQUEST_FAILED'])[
    preferred === 'ar' ? 'ar' : 'en'
  ];
}

// Controllers pass data directly; pagination belongs inside data, alongside items.
export function sendSuccess(response: Response, data?: unknown, code?: string) {
  code ??=
    response.statusCode === 201
      ? 'CREATED'
      : response.statusCode === 202
        ? 'ACCEPTED'
        : 'SUCCESS';
  return response.json({
    success: true,
    code,
    message: message(response, code),
    ...(data === undefined ? {} : { data }),
  });
}

// Only unexpected server failures expose a support reference, never exception details.
export function sendFailure(
  response: Response,
  status: number,
  code: string,
  unexpected = false,
) {
  return response.status(status).json({
    success: false,
    code,
    message: message(response, code),
    ...(unexpected && status >= 500
      ? { requestId: response.locals.requestId }
      : {}),
  });
}
