"use client";

import { useState, useEffect, useCallback } from "react";

const NAV_LINKS = [
  { label: "ACCUEIL", href: "#" },
  { label: "PROJETS", href: "#projets" },
  { label: "À PROPOS", href: "#apropos" },
  { label: "CULTURE", href: "#culture" },
  { label: "CONTACT", href: "#contact" },
] as const;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* lock body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        height: 80,
        backgroundColor: scrolled ? "#1D1D1D" : "transparent",
      }}
    >
      {/* ---------- desktop bar ---------- */}
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6 lg:px-12">
        {/* logo */}
        <a href="#" className="shrink-0">
          <img
            src="/images/logo-secondary.svg"
            alt="CARGO Architecture"
            className="h-7 w-auto"
          />
        </a>

        {/* center nav — desktop only */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-white hover:opacity-70 transition-opacity"
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* right side — desktop */}
        <div className="hidden lg:flex items-center gap-6">
          <a
            href="#"
            className="text-white hover:opacity-70 transition-opacity"
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            EN
          </a>

          <a
            href="#contact"
            className="inline-flex items-center border border-white text-white hover:bg-white hover:text-cargo-dark transition-colors duration-300"
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "10px 22px",
            }}
          >
            VOTRE PROJET COMMENCE ICI
          </a>
        </div>

        {/* hamburger — mobile only */}
        <button
          type="button"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="lg:hidden flex flex-col justify-center gap-[5px] p-2"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span
            className="block h-[1.5px] w-6 bg-white transition-transform duration-300 origin-center"
            style={mobileOpen ? { transform: "translateY(3.25px) rotate(45deg)" } : undefined}
          />
          <span
            className="block h-[1.5px] w-6 bg-white transition-opacity duration-300"
            style={{ opacity: mobileOpen ? 0 : 1 }}
          />
          <span
            className="block h-[1.5px] w-6 bg-white transition-transform duration-300 origin-center"
            style={mobileOpen ? { transform: "translateY(-3.25px) rotate(-45deg)" } : undefined}
          />
        </button>
      </div>

      {/* ---------- mobile overlay ---------- */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-cargo-dark flex flex-col items-center justify-center gap-8 lg:hidden"
          style={{ top: 80, zIndex: 40 }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={closeMobile}
              className="text-white hover:opacity-70 transition-opacity"
              style={{
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {link.label}
            </a>
          ))}

          <div className="flex flex-col items-center gap-6 mt-4">
            <a
              href="#"
              onClick={closeMobile}
              className="text-white hover:opacity-70"
              style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.1em" }}
            >
              EN
            </a>
            <a
              href="#contact"
              onClick={closeMobile}
              className="inline-flex items-center border border-white text-white hover:bg-white hover:text-cargo-dark transition-colors duration-300"
              style={{
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "12px 26px",
              }}
            >
              VOTRE PROJET COMMENCE ICI
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
