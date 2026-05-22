import "./globals.css";

export const metadata = {
  title: "Fisiobiss B2B — Ecosistema de Distribución",
  description: "Panel mayorista de analítica y carga transaccional en tiempo real.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}