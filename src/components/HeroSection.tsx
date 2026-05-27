"use client";

const SETTLEMENTS = [
  { amount: "$600,000", type: "Truck Accident" },
  { amount: "$600,000", type: "Car Accident" },
  { amount: "$800,000", type: "Truck Accident" },
  { amount: "$1,250,000", type: "Motorcycle Accident" },
] as const;

export default function HeroSection() {
  return (
    <section
      className="relative w-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        minHeight: "90vh",
        background: `
          linear-gradient(
            180deg,
            rgba(20, 25, 31, 0.85) 0%,
            rgba(0, 0, 0, 0.7) 40%,
            rgba(20, 25, 31, 0.9) 100%
          ),
          linear-gradient(
            135deg,
            #1a1208 0%,
            #2a1f0d 20%,
            #14191F 40%,
            #1c1510 60%,
            #0d0f12 80%,
            #14191F 100%
          )
        `,
      }}
    >
      {/* Subtle bookshelf texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 60px,
              rgba(30, 20, 10, 0.3) 60px,
              rgba(30, 20, 10, 0.3) 62px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 120px,
              rgba(20, 15, 8, 0.15) 120px,
              rgba(20, 15, 8, 0.15) 122px
            )
          `,
          opacity: 0.4,
        }}
      />

      {/* Gold decorative line at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2"
        style={{
          width: 80,
          height: 2,
          backgroundColor: "var(--color-mh-gold)",
          opacity: 0.6,
        }}
      />

      {/* Main headline content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 mt-16 lg:mt-0">
        {/* Main amount */}
        <h1
          className="font-serif"
          style={{
            fontSize: "clamp(36px, 6vw, 72px)",
            fontStyle: "italic",
            fontWeight: 400,
            color: "var(--color-mh-white)",
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            marginBottom: 16,
          }}
        >
          OVER $500 MILLION RECOVERED
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 500,
            color: "var(--color-mh-gold)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            lineHeight: 1.4,
          }}
        >
          FOR ACCIDENT VICTIMS IN ALABAMA
        </p>

        {/* Gold decorative dash */}
        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: "var(--color-mh-gold)",
            marginTop: 32,
            marginBottom: 48,
            opacity: 0.7,
          }}
        />
      </div>

      {/* Settlement results cards */}
      <div className="relative z-10 w-full px-6 lg:px-12 mb-12">
        <div
          className="flex gap-4 overflow-x-auto no-scrollbar justify-center"
          style={{ paddingBottom: 8 }}
        >
          {SETTLEMENTS.map((item, idx) => (
            <div
              key={idx}
              className="shrink-0 flex flex-col items-center"
              style={{
                backgroundColor: "var(--color-mh-dark)",
                border: "1px solid rgba(240, 174, 31, 0.15)",
                borderTop: "3px solid var(--color-mh-gold)",
                padding: "28px 36px",
                minWidth: 200,
              }}
            >
              <span
                className="font-serif"
                style={{
                  fontSize: 28,
                  fontStyle: "italic",
                  fontWeight: 400,
                  color: "var(--color-mh-white)",
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}
              >
                {item.amount}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--color-mh-gold)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {item.type}
              </span>
            </div>
          ))}
        </div>

        {/* View All Results link */}
        <div className="flex justify-center mt-6">
          <a
            href="#results"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--color-mh-gold)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
            className="hover:opacity-80 transition-opacity"
          >
            View All Results &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
