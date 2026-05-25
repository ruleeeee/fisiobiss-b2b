import { NextResponse } from "next/server";
 
export async function POST(req) {
  try {
    const { username, password } = await req.json();
 
    const validUser = process.env.AUTH_USERNAME;
    const validPass = process.env.AUTH_PASSWORD;
    const secret    = process.env.SESSION_SECRET;
 
    if (!validUser || !validPass || !secret) {
      return NextResponse.json({ error: "Servidor no configurado." }, { status: 500 });
    }
 
    const ok = username === validUser && password === validPass;
 
    if (!ok) {
      return NextResponse.json(
        { error: "Usuario o contraseña incorrectos." },
        { status: 401 }
      );
    }
 
    const res = NextResponse.json({ ok: true });
    res.cookies.set("fb2b_session", secret, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 8, // 8 horas
      path:     "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}