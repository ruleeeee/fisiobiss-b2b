const DEFAULT_FOLDER_ID = "1zSfRLyvyEDV9q9CwJwU7lk_WxgC5EDah";

function folderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_FOLDER_ID;
}

async function userAccessToken() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refresh) {
    throw new Error("Drive todavía no está conectado con una cuenta de Google. Hay que autorizarlo una vez con Vicente.");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description || "No se pudo renovar el acceso a Drive");
  }
  return data.access_token;
}

async function uploadViaWebApp({ name, mime, bytes }) {
  const url = process.env.GOOGLE_DRIVE_WEBAPP_URL;
  const secret = process.env.GOOGLE_DRIVE_WEBAPP_SECRET;
  if (!url || !secret) return null;

  const payload = JSON.stringify({
    secret,
    name,
    mime,
    data: Buffer.from(bytes).toString("base64"),
  });
  const send = (target) => fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    redirect: "manual",
  });

  let res = await send(url);
  if (res.status >= 300 && res.status < 400) {
    const next = res.headers.get("location");
    if (!next) throw new Error("Drive no entregó la dirección de subida");
    res = await fetch(next);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Drive ${res.status}`);
  if (!data.id) throw new Error("Drive no devolvió el archivo");
  return data;
}

export async function uploadComprobante({ orderId, name, mime, bytes }) {
  const viaWebApp = await uploadViaWebApp({ name, mime, bytes });
  if (viaWebApp) {
    return {
      id: viaWebApp.id,
      name: viaWebApp.name || name,
      webViewLink: viaWebApp.webViewLink || `https://drive.google.com/file/d/${viaWebApp.id}/view`,
      orderId,
    };
  }

  const parentId = folderId();
  if (!parentId) throw new Error("Falta la carpeta de Drive");

  const meta = { name, parents: [parentId] };
  const boundary = `fisiobiss_${crypto.randomUUID()}`;
  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`;
  const fileHead = `--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const head = new TextEncoder().encode(metaPart + fileHead);
  const end = new TextEncoder().encode(tail);
  const body = new Uint8Array(head.length + bytes.byteLength + end.length);
  body.set(head, 0);
  body.set(new Uint8Array(bytes), head.length);
  body.set(end, head.length + bytes.byteLength);

  const token = await userAccessToken();
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  if (!res.ok) {
    const text = await res.text();
    let detail = "";
    try { detail = JSON.parse(text)?.error?.message || ""; } catch { detail = text.slice(0, 180); }
    throw new Error(detail || `Drive ${res.status}`);
  }
  const data = await res.json();
  if (!data.id) throw new Error("Drive no devolvió el archivo");

  await fetch(
    `https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    },
  ).catch(() => {});

  return {
    id: data.id,
    name: data.name || name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    orderId,
  };
}
