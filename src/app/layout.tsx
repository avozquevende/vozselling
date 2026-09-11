import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voz Selling",
  description: "Prospecção e condução de vendas no Instagram.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
