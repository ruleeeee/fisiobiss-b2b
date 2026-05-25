import { NextResponse } from "next/server";
 
// Credenciales hardcoded — cambiar aquí si se quiere actualizar
const CREDS = {
  user:  "fisiobissb2b_admin",
  pass:  "Fb2b@S3cur3#2026",
  token: "fb2b_tok_d2b116085634_secure_2026",
};
 
export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (username === CREDS.user && password === CREDS.pass) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("fb2b_session", CREDS.token, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge:   60 * 60 * 8, // 8 horas
        path:     "/",
      });
      return res;
    }
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}