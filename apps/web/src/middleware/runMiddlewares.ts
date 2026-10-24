import { NextResponse, type NextRequest } from 'next/server';

type Middleware = (
  request: NextRequest,
  previousResponse: NextResponse | null,
) => NextResponse | null | Promise<NextResponse | null>;

export default async function runMiddlewares(
  request: NextRequest,
  middlewares: Middleware[],
): Promise<NextResponse> {
  let currentResponse: NextResponse | null = null;

  // Run in the order supplied by proxy.ts, passing each response to the next step.
  for (const middleware of middlewares) {
    currentResponse = await middleware(request, currentResponse);
    // Stop on redirects and errors so later middleware cannot replace them.
    if (currentResponse && !currentResponse.ok) return currentResponse;
  }

  return currentResponse ?? NextResponse.next();
}
