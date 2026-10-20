import "./globals.css";
import { Poppins, JetBrains_Mono } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Fisiobiss B2B — Ecosistema de Distribución",
  description: "Panel mayorista de analítica y carga transaccional en tiempo real.",
};

const themeBoot = `(function(){try{if(localStorage.getItem("fb2b_theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}})()`;

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${poppins.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
