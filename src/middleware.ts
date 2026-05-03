import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(_request: NextRequest) {
  // Pass-through; client pages handle auth redirects.
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
