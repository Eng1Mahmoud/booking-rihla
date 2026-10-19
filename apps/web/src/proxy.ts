import type { NextRequest } from 'next/server';
import { authMiddleware } from '@/middleware/authMiddleware';
import { intlMiddleware } from '@/middleware/intlMiddleware';
import runMiddlewares from '@/middleware/runMiddlewares';

export default function proxy(request: NextRequest) {
  return runMiddlewares(request, [authMiddleware, intlMiddleware]);
}

export const config = { matcher: '/((?!api|_next|_vercel|.*\\..*).*)' };
