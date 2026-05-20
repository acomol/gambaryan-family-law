import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/* Swiss 721 BT → Inter (closest Google Fonts neo-grotesque match)
   Original: swiss 400/500/700/800 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  style: ["normal", "italic"],
});

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
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cargo-dark text-white font-body">
        {children}
      </body>
    </html>
  );
}
