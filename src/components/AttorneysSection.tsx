"use client";

export default function AttorneysSection() {
  return (
    <section className="relative bg-[var(--color-mh-dark)] py-20 lg:py-32 overflow-hidden">
      {/* Atmospheric dark gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 80%, rgba(20,25,31,0.3) 0%, rgba(0,0,0,0.8) 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1400px] px-4 lg:px-8">
        {/* Two attorneys side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-0">
          {/* Joel Hamner */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left px-4 lg:px-12">
            {/* Portrait placeholder */}
            <div
              className="w-64 h-80 lg:w-72 lg:h-96 mb-8 rounded-t-full mx-auto"
              style={{
                background:
                  "linear-gradient(180deg, rgba(63,68,75,0.4) 0%, rgba(20,25,31,0.9) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            />

            <h3
              className="font-serif text-white mb-4"
              style={{ fontSize: "clamp(28px, 3vw, 40px)", lineHeight: 1.1 }}
            >
              Joel Hamner
            </h3>

            <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-sm">
              Joel Hamner has dedicated his career to fighting for the rights of
              injured Alabamians. With decades of experience in personal injury
              law, he brings tenacity and compassion to every case he handles.
            </p>

            <a
              href="#"
              className="inline-block px-8 py-3 bg-[var(--color-mh-gray)] text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors duration-200"
            >
              LEARN MORE
            </a>
          </div>

          {/* Tom McCutcheon */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left px-4 lg:px-12">
            {/* Portrait placeholder */}
            <div
              className="w-64 h-80 lg:w-72 lg:h-96 mb-8 rounded-t-full mx-auto"
              style={{
                background:
                  "linear-gradient(180deg, rgba(63,68,75,0.4) 0%, rgba(20,25,31,0.9) 100%)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            />

            <h3
              className="font-serif text-white mb-4"
              style={{ fontSize: "clamp(28px, 3vw, 40px)", lineHeight: 1.1 }}
            >
              Tom McCutcheon
            </h3>

            <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-sm">
              Tom McCutcheon is a nationally recognized trial lawyer who has
              secured millions in verdicts and settlements for his clients. His
              aggressive approach and legal expertise make him a formidable
              advocate in the courtroom.
            </p>

            <a
              href="#"
              className="inline-block px-8 py-3 bg-[var(--color-mh-gray)] text-white text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-colors duration-200"
            >
              LEARN MORE
            </a>
          </div>
        </div>

        {/* Bottom heading */}
        <div className="mt-16 lg:mt-24 text-center">
          <h2
            className="font-serif text-white max-w-4xl mx-auto"
            style={{ fontSize: "clamp(24px, 3vw, 36px)", lineHeight: 1.2 }}
          >
            Learn Why McCutcheon &amp; Hamner Is The Best Law Firm In Alabama
          </h2>
        </div>
      </div>
    </section>
  );
}
