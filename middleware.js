import { NextResponse } from "next/server";
 
const SESSION_TOKEN = "fb2b_tok_d2b116085634_secure_2026";
 
export function middleware(request) {
  const { pathname } = request.nextUrl;
 
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/geo") ||
    pathname.startsWith("/brand") ||
    pathname === "/favicon.ico";
 
  if (isPublic) return NextResponse.next();
 
  const session = request.cookies.get("fb2b_session")?.value;
  if (session === SESSION_TOKEN) return NextResponse.next();
 
  const url = new URL("/login", request.url);
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}
 
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};