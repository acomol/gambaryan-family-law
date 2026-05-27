"use client";

const reviews = [
  { name: "Sarah M." },
  { name: "James T." },
  { name: "Michael R." },
  { name: "Amanda K." },
  { name: "Robert L." },
  { name: "Jessica P." },
];

export default function ReviewsTicker() {
  const allReviews = [...reviews, ...reviews];

  return (
    <section
      className="py-6 overflow-hidden"
      style={{ backgroundColor: "var(--color-mh-dark)" }}
    >
      <div className="relative">
        <div className="flex animate-ticker whitespace-nowrap">
          {allReviews.map((review, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center gap-6 px-8"
            >
              <span className="text-white font-body text-base font-medium">
                {review.name}
              </span>
              <span className="text-[var(--color-mh-gold)] text-lg tracking-wide">
                ★★★★★
              </span>
              <span className="text-[var(--color-mh-gold)] text-xs uppercase tracking-widest">
                Verified Review ✓
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 30s linear infinite;
        }
      `}</style>
    </section>
  );
}
