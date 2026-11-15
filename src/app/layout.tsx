import type { Metadata, Viewport } from "next";
import { Archivo, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const titulo = Archivo({ variable: "--font-titulo", subsets: ["latin"], axes: ["wdth"] });
const corpo = Source_Sans_3({ variable: "--font-corpo", subsets: ["latin"] });
const dados = IBM_Plex_Mono({ variable: "--font-dados", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Terrana", template: "%s · Terrana" },
  description: "Planejamento de rotação de culturas com dados de satélite da NASA, para o técnico e para o produtor.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2f6b3a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${titulo.variable} ${corpo.variable} ${dados.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-[16px] leading-relaxed">{children}</body>
    </html>
  );
}
