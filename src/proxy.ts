import { NextResponse, type NextRequest } from "next/server";

/**
 * Checagem otimista: sem cookie de sessão, manda para o login.
 * A validação real (sessão no banco + permissão no GC) fica na DAL.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("gc_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/gcs", "/gc/:path*"],
};
