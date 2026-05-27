"use client";

export default function NeverSettleLess() {
  return (
    <section
      className="py-20 px-6"
      style={{ backgroundColor: "var(--color-mh-dark)" }}
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left: Placeholder image */}
        <div
          className="aspect-[4/3] rounded-sm flex items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, #1a1f27 0%, #2a2f37 50%, #1a1f27 100%)",
          }}
        >
          <span className="text-[var(--color-mh-gray)] text-sm uppercase tracking-widest font-body">
            Image
          </span>
        </div>

        {/* Right: Content */}
        <div>
          <h2 className="text-3xl md:text-4xl font-heading uppercase text-white mb-4 tracking-wide">
            Never Settle for Less
          </h2>

          <p
            className="text-base font-body mb-6"
            style={{ color: "var(--color-mh-gold)" }}
          >
            Aggressive advocacy. Proven results. Your fight is our fight.
          </p>

          <p className="text-[var(--color-mh-tan)] font-body leading-relaxed mb-8">
            At McCutcheon &amp; Hamner, we understand the devastating impact an
            accident can have on your life and your family. Insurance companies
            will try to minimize your claim or deny it altogether. Our approach
            is different. We prepare every case as if it&apos;s going to trial,
            which gives us maximum leverage in negotiations. When the other side
            knows you&apos;re ready to fight, they bring better offers to the
            table.
          </p>

          <a
            href="#contact"
            className="inline-block px-8 py-3 border-2 border-[var(--color-mh-gold)] text-[var(--color-mh-gold)] font-body font-medium uppercase text-sm tracking-wider transition-all duration-300 hover:bg-[var(--color-mh-gold)] hover:text-[var(--color-mh-dark)]"
          >
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
