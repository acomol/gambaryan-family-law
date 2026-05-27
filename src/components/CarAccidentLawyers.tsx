"use client";

const leftItems = [
  "Free Case Evaluation",
  "No Upfront Costs",
  "Aggressive Representation",
  "Maximum Compensation",
];

const rightItems = [
  "24/7 Availability",
  "Local Expertise",
  "Proven Track Record",
  "Millions Recovered",
];

export default function CarAccidentLawyers() {
  return (
    <section
      className="py-20 px-6 relative"
      style={{ backgroundColor: "var(--color-mh-black)" }}
    >
      {/* Subtle overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(13,17,23,0.6) 0%, rgba(0,0,0,0.9) 100%)",
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-serif italic text-white mb-12">
          Best Car Accident Lawyers In North Alabama
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Left column */}
          <ul className="space-y-5 text-left">
            {leftItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--color-mh-gold)" }}
                />
                <span className="text-white font-body text-base">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          {/* Right column */}
          <ul className="space-y-5 text-left">
            {rightItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--color-mh-gold)" }}
                />
                <span className="text-white font-body text-base">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
