import { NextResponse, type NextRequest } from 'next/server';

type Middleware = (
  request: NextRequest,
  response: NextResponse | null,
) => NextResponse | null | Promise<NextResponse | null>;

export default async function runMiddlewares(
  request: NextRequest,
  middlewares: Middleware[],
): Promise<NextResponse> {
  let response: NextResponse | null = null;

  for (const middleware of middlewares) {
    response = await middleware(request, response);
    // A redirect or error ends the chain; later middleware must not replace it.
    if (response && !response.ok) return response;
  }

  return response ?? NextResponse.next();
}
