"use client";

export default function WelcomeSection() {
  return (
    <section
      className="py-20 px-6"
      style={{ backgroundColor: "var(--color-mh-light)" }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2
          className="text-2xl md:text-3xl font-heading uppercase tracking-wide mb-2"
          style={{ color: "var(--color-mh-dark)" }}
        >
          Welcome to Alabama&apos;s Best Personal Injury Lawyers
        </h2>

        <div
          className="w-16 h-[3px] mx-auto my-6"
          style={{ backgroundColor: "var(--color-mh-gold)" }}
        />

        <p
          className="text-3xl md:text-4xl font-serif italic mb-4"
          style={{ color: "var(--color-mh-dark)" }}
        >
          McCutcheon &amp; Hamner, P.C.
        </p>

        <p
          className="text-base font-body mb-10 tracking-wide"
          style={{ color: "var(--color-mh-gold)" }}
        >
          Serving Florence, Huntsville, and Athens, Alabama
        </p>

        <p
          className="text-base leading-relaxed font-body max-w-3xl mx-auto"
          style={{ color: "var(--color-mh-gray)" }}
        >
          For over two decades, McCutcheon &amp; Hamner has been a trusted name
          in personal injury law across North Alabama. Our attorneys have
          recovered millions of dollars for accident victims who suffered
          because of someone else&apos;s negligence. Whether you were injured
          in a car crash, a trucking accident, or a workplace incident, our
          team fights tirelessly to secure the compensation you deserve. We
          believe every client should be treated like family, and we never
          charge a fee unless we win your case.
        </p>
      </div>
    </section>
  );
}
