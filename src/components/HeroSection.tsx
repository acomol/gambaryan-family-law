"use client";

const ANCHOR_NAV = [
  { label: "Firme", href: "#firme" },
  { label: "Services", href: "#services" },
  { label: "Approche", href: "#approche" },
  { label: "Équipe", href: "#equipe" },
  { label: "Prix et distinctions", href: "#prix" },
] as const;

export default function HeroSection() {
  return (
    <section
      className="relative w-full bg-cargo-dark overflow-hidden"
      style={{ height: "100vh", minHeight: 600 }}
    >
      {/* ---- split brand text anchored to bottom ---- */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 lg:px-12 pb-10 lg:pb-14 pointer-events-none select-none">
        <span
          className="text-white leading-none"
          style={{
            fontSize: "clamp(60px, 8vw, 120px)",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          CARGO
        </span>

        <span
          className="text-white leading-none"
          style={{
            fontSize: "clamp(60px, 8vw, 120px)",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          ARCHITECTURE
        </span>
      </div>

      {/* ---- right-side vertical anchor nav ---- */}
      <nav
        className="absolute right-6 lg:right-12 top-1/2 hidden lg:flex flex-col gap-6"
        style={{ transform: "translateY(-50%)" }}
      >
        {ANCHOR_NAV.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="group flex items-center gap-4 text-white hover:opacity-100 transition-opacity"
            style={{ opacity: 0.7 }}
          >
            {/* small horizontal rule */}
            <span
              className="block transition-all duration-300 group-hover:w-10 group-hover:opacity-50"
              style={{
                width: 40,
                height: 1,
                backgroundColor: "rgba(255,255,255,0.2)",
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>
          </a>
        ))}
      </nav>
    </section>
  );
}
