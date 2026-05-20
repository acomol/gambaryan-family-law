import type { Metadata } from "next";
import "./globals.css";

/* Swiss 721 BT — self-hosted from /fonts/swiss/
   Loaded via @font-face in globals.css */

export const metadata: Metadata = {
  title: "CARGOarchitecture | À PROPOS",
  description:
    "CARGOarchitecture rassemble une équipe de professionnels talentueux en architecture, design d'intérieur et planification. Québec, Canada.",
  openGraph: {
    title: "CARGOarchitecture | À PROPOS",
    description:
      "Architectes expérimentés, techniciens spécialisés et designers d'intérieur. Approche proactive et collaborative.",
    images: ["/images/team-photo.webp"],
  },
  icons: {
    icon: "/images/logo-dark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cargo-dark text-white font-body">
        {children}
      </body>
    </html>
  );
}
