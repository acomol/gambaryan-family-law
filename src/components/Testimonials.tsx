"use client";

import { useState } from "react";

const REVIEWS = [
  {
    quote:
      "Tom and Joel fought hard for our family after a devastating truck accident. They got us a settlement that truly changed our lives. We cannot thank them enough.",
    name: "Sarah M.",
    source: "Google",
  },
  {
    quote:
      "From the very first phone call, I felt like they genuinely cared about my situation. They kept me informed every step of the way and delivered results beyond my expectations.",
    name: "James R.",
    source: "Google",
  },
  {
    quote:
      "After my motorcycle accident, I was overwhelmed and scared. McCutcheon & Hamner took the burden off my shoulders and secured a fair settlement quickly.",
    name: "Linda T.",
    source: "Google",
  },
  {
    quote:
      "The best law firm in Alabama, hands down. They went up against a huge insurance company and won. I highly recommend them to anyone who has been injured.",
    name: "David K.",
    source: "Google",
  },
  {
    quote:
      "Professional, compassionate, and incredibly skilled. Joel Hamner personally handled my case and kept me in the loop at every turn. Five stars all the way.",
    name: "Michelle P.",
    source: "Google",
  },
];

export default function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section className="bg-[var(--color-mh-dark)] py-16 lg:py-24 border-t border-white/5">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — branding + info */}
          <div className="text-center lg:text-left">
            {/* MH logo text */}
            <div className="mb-4">
              <span
                className="font-heading text-white uppercase tracking-wider"
                style={{ fontSize: 14, letterSpacing: "0.2em" }}
              >
                McCutcheon &amp; Hamner
              </span>
            </div>

            <h2
              className="text-[var(--color-mh-gold)] font-serif italic mb-4"
              style={{ fontSize: "clamp(28px, 3vw, 40px)", lineHeight: 1.15 }}
            >
              Client Testimonials
            </h2>

            <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
              Our clients consistently rate us 5 stars. We take pride in
              delivering not just results, but an exceptional client experience
              from start to finish.
            </p>

            {/* 5 gold stars */}
            <div className="flex justify-center lg:justify-start gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="w-6 h-6 text-[var(--color-mh-gold)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <p className="text-white/40 text-xs uppercase tracking-wider">
              Based on 200+ verified reviews
            </p>
          </div>

          {/* Right — quote carousel */}
          <div className="relative">
            {/* Quote */}
            <div className="min-h-[200px]">
              <svg
                className="w-10 h-10 text-[var(--color-mh-gold)] opacity-30 mb-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H0z" />
              </svg>

              <p
                className="font-serif italic text-white leading-relaxed mb-6"
                style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
              >
                &ldquo;{REVIEWS[active].quote}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <span className="text-white font-semibold text-sm">
                  {REVIEWS[active].name}
                </span>
                <span className="text-white/30">|</span>
                <span className="text-[var(--color-mh-gold)] text-xs font-semibold flex items-center gap-1">
                  {REVIEWS[active].source}
                  {/* Mini stars */}
                  <span className="inline-flex gap-0.5 ml-1">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-3 h-3 text-[var(--color-mh-gold)]"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </span>
                </span>
              </div>
            </div>

            {/* Dot pagination */}
            <div className="flex justify-center lg:justify-start gap-2 mt-8">
              {[...Array(10)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i % REVIEWS.length)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                    i % REVIEWS.length === active
                      ? "bg-[var(--color-mh-gold)] scale-125"
                      : "bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to review ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
