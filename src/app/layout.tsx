import type { Metadata } from "next";
import "./globals.css";

/* Archivo + Archivo Black — Google Fonts
   meno-display — Adobe Typekit (kit af) */

export const metadata: Metadata = {
  title: "McCutcheon & Hamner | Alabama Injury Lawyers",
  description:
    "McCutcheon & Hamner, P.C. — Alabama's top personal injury lawyers. Over $500 million recovered. Free consultation. Serving Huntsville, Florence, and Athens.",
  openGraph: {
    title: "McCutcheon & Hamner | Alabama Injury Lawyers Fighting for Accident Victims",
    description:
      "Over $500 million recovered for accident victims across North Alabama. Free consultation — no fees until we win.",
    images: ["/images/og-hero.jpg"],
  },
  icons: {
    icon: "/images/mh-logo-gold.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Google Fonts: Archivo family */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=Archivo+Narrow:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Adobe Typekit: meno-display serif */}
        <link rel="stylesheet" href="https://use.typekit.net/af.css" />
      </head>
      <body className="min-h-full flex flex-col bg-mh-black text-white font-body">
        {children}
      </body>
    </html>
  );
}
