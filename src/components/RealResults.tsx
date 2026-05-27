"use client";

export default function RealResults() {
  return (
    <section
      className="py-20 px-6"
      style={{ backgroundColor: "var(--color-mh-dark-alt)" }}
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif italic text-white text-center mb-4">
          Real Lawyers. Real Results.
        </h2>

        <div
          className="w-20 h-[3px] mx-auto mb-12"
          style={{ backgroundColor: "var(--color-mh-gold)" }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left column */}
          <div>
            <p className="text-[var(--color-mh-tan)] font-body leading-relaxed">
              Our attorneys have decades of combined courtroom experience,
              having tried hundreds of cases before juries across Alabama. We
              don&apos;t shy away from the courtroom — in fact, our track record
              of verdicts is what compels insurance companies to offer fair
              settlements. From catastrophic injury claims to wrongful death
              suits, we have secured multi-million dollar recoveries that have
              changed our clients&apos; lives.
            </p>
          </div>

          {/* Right column */}
          <div>
            <p className="text-[var(--color-mh-tan)] font-body leading-relaxed">
              We are dedicated to providing every client with personal attention
              and aggressive representation. When you call our office, you speak
              directly with an attorney — not an assistant or an answering
              service. Your case matters to us because you matter to us. That
              dedication is why our clients recommend us to their friends and
              families, and why we have earned hundreds of five-star reviews.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
