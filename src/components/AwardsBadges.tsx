"use client";

const badges = [
  "Best Law Firms",
  "US News Distinguished",
  "Alabama State Bar",
  "Best Lawyers 2025",
  "Million Dollar Advocates",
  "Top 100 Trial Lawyers",
  "Avvo 10.0",
  "Readers' Choice",
  "Attorney at Law Magazine",
  "Super Lawyers",
];

export default function AwardsBadges() {
  return (
    <section
      className="py-16 px-6"
      style={{ backgroundColor: "var(--color-mh-dark)" }}
    >
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-[var(--color-mh-tan)] mb-10 font-body">
          As Featured In
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {badges.map((badge) => (
            <div
              key={badge}
              className="border border-[var(--color-mh-gold)] rounded-sm px-4 py-6 flex items-center justify-center text-center transition-all duration-300 hover:shadow-[0_0_20px_rgba(240,174,31,0.15)] hover:border-opacity-80"
            >
              <span className="text-white text-sm font-body font-medium leading-tight">
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
