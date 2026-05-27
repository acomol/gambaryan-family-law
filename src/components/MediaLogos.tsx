"use client";

const MEDIA_OUTLETS = [
  "FOX",
  "CBS",
  "ABC",
  "US NEWS",
  "WBRC NEWS 6",
  "WAFF 48",
] as const;

export default function MediaLogos() {
  return (
    <section className="relative w-full">
      {/* Gold line top */}
      <div
        style={{
          height: 2,
          background: "linear-gradient(90deg, transparent, var(--color-mh-gold), transparent)",
        }}
      />

      {/* Media bar */}
      <div
        className="flex items-center justify-center gap-8 md:gap-14 px-6 overflow-x-auto no-scrollbar"
        style={{
          backgroundColor: "var(--color-mh-dark)",
          height: 64,
        }}
      >
        {MEDIA_OUTLETS.map((name) => (
          <span
            key={name}
            style={{
              fontFamily: "var(--font-narrow)",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255, 255, 255, 0.5)",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Gold line bottom */}
      <div
        style={{
          height: 2,
          background: "linear-gradient(90deg, transparent, var(--color-mh-gold), transparent)",
        }}
      />
    </section>
  );
}
