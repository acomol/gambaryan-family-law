"use client";

import { useState, useEffect } from "react";

const NAV_LINKS = [
  { label: "Personal Injury", href: "#", hasDropdown: true },
  { label: "The Firm", href: "#", hasDropdown: true },
  { label: "Insights", href: "#", hasDropdown: true },
  { label: "Offices", href: "#", hasDropdown: true },
  { label: "Contact", href: "#contact", hasDropdown: false },
  { label: "Testimonials", href: "#testimonials", hasDropdown: false },
] as const;

const TOP_LINKS = [
  { label: "Wills For Warriors", href: "#" },
  { label: "Water Contamination", href: "#" },
  { label: "Chat", href: "#" },
  { label: "Search", href: "#" },
] as const;

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-shadow duration-300"
      style={{
        backgroundColor: "var(--color-mh-dark)",
        boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.5)" : "none",
      }}
    >
      {/* Top utility bar */}
      <div
        className="hidden lg:flex items-center justify-end gap-6 px-8"
        style={{
          height: 32,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {TOP_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            style={{
              fontSize: 11,
              letterSpacing: "0.04em",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "var(--font-body)",
              textTransform: "uppercase",
            }}
            className="hover:text-white transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Main header bar */}
      <div
        className="flex items-center justify-between px-6 lg:px-8"
        style={{ height: 80 }}
      >
        {/* Left: Logo + Firm Name */}
        <a href="#" className="flex items-center gap-4 shrink-0">
          {/* MH Monogram */}
          <div
            style={{
              width: 48,
              height: 48,
              border: "2px solid var(--color-mh-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 20,
                color: "var(--color-mh-gold)",
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            >
              MH
            </span>
          </div>

          {/* Firm name */}
          <div className="hidden md:flex flex-col">
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 15,
                color: "var(--color-mh-white)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              McCUTCHEON &amp; HAMNER
            </span>
            <span
              style={{
                fontFamily: "var(--font-narrow)",
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                lineHeight: 1.4,
              }}
            >
              ATTORNEYS AT LAW
            </span>
          </div>
        </a>

        {/* Center: Navigation */}
        <nav className="hidden xl:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:opacity-80 transition-opacity"
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--color-mh-gold)",
                whiteSpace: "nowrap",
              }}
            >
              {link.label}
              {link.hasDropdown && (
                <span style={{ marginLeft: 4, fontSize: 10 }}>&#9662;</span>
              )}
            </a>
          ))}
        </nav>

        {/* Right: Phone + CTA */}
        <div className="hidden lg:flex flex-col items-end shrink-0">
          <a
            href="tel:2563877947"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              color: "var(--color-mh-gold)",
              letterSpacing: "0.02em",
              lineHeight: 1.2,
            }}
            className="hover:opacity-80 transition-opacity"
          >
            (256) 387-7947
          </a>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              color: "var(--color-mh-gold)",
              letterSpacing: "0.03em",
              opacity: 0.85,
              marginTop: 2,
            }}
          >
            Free Consultation | No Fees Until We Win
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label="Open menu"
          className="xl:hidden flex flex-col justify-center gap-[5px] p-2"
        >
          <span className="block h-[2px] w-6" style={{ backgroundColor: "var(--color-mh-gold)" }} />
          <span className="block h-[2px] w-6" style={{ backgroundColor: "var(--color-mh-gold)" }} />
          <span className="block h-[2px] w-6" style={{ backgroundColor: "var(--color-mh-gold)" }} />
        </button>
      </div>
    </header>
  );
}
