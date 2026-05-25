import { NextResponse } from "next/server";
 
export function middleware(request) {
  const { pathname } = request.nextUrl;
 
  // Rutas públicas: login y sus APIs
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";
 
  if (isPublic) return NextResponse.next();
 
  // Verificar cookie de sesión
  const session    = request.cookies.get("fb2b_session")?.value;
  const validToken = process.env.SESSION_SECRET;
 
  // Si SESSION_SECRET no está configurada O la cookie no coincide → redirigir
  const isAuthenticated = validToken && session && session === validToken;
 
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
 
  return NextResponse.next();
}
 
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};