"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "We Will Immediately Take Action By:",
    answer:
      "Our legal team springs into action the moment you contact us. We will investigate the scene of your accident, preserve critical evidence, identify all liable parties, document your injuries and medical treatment, communicate with insurance companies on your behalf, and begin building the strongest possible case for your recovery. Time is critical in personal injury cases, and we ensure no evidence is lost.",
  },
  {
    question: "What Sets Us Apart:",
    answer:
      "McCutcheon & Hamner combines decades of trial experience with a genuine commitment to our clients' well-being. We have secured millions in verdicts and settlements. Our firm operates on a contingency fee basis, meaning you pay nothing unless we win. We limit our caseload to provide personalized attention, and our attorneys are available around the clock for emergencies.",
  },
  {
    question: "Your Rights After An Accident:",
    answer:
      "After an accident, you have the right to seek medical treatment immediately, the right to file a claim against the at-fault party, the right to refuse recorded statements from insurance adjusters, and the right to legal representation. Alabama's statute of limitations gives you two years to file a personal injury lawsuit, but early action is crucial to preserving evidence and protecting your claim.",
  },
  {
    question: "How Much Does It Cost To Hire Us?",
    answer:
      "It costs you nothing upfront to hire McCutcheon & Hamner. We work exclusively on a contingency fee basis for personal injury cases. This means we only get paid if we win your case. Our initial consultation is always free, and there are no hidden fees or surprise charges. If we don't recover compensation for you, you owe us nothing.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (i: number) => {
    setOpenIndex(openIndex === i ? -1 : i);
  };

  return (
    <section
      className="py-16 lg:py-24"
      style={{ backgroundColor: "var(--color-mh-tan, #D4C5A0)" }}
    >
      <div className="mx-auto max-w-[1100px] px-4 lg:px-8">
        {/* Heading */}
        <h2
          className="font-serif text-[var(--color-mh-dark)] mb-3 text-center lg:text-left"
          style={{ fontSize: "clamp(26px, 3vw, 38px)", lineHeight: 1.15 }}
        >
          Do I Need a Lawyer for My Personal Injury Claim?
        </h2>

        <p className="text-[var(--color-mh-gold)] font-semibold text-base mb-10 text-center lg:text-left">
          Understanding the Importance of Legal Representation
        </p>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="overflow-hidden rounded-md">
              {/* Header */}
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-6 py-4 bg-[var(--color-mh-dark)] text-white text-left cursor-pointer hover:bg-[var(--color-mh-gray)] transition-colors duration-200"
              >
                <span className="font-semibold text-sm lg:text-base pr-4">
                  {item.question}
                </span>
                <span className="text-[var(--color-mh-gold)] text-2xl font-light shrink-0">
                  {openIndex === i ? "−" : "+"}
                </span>
              </button>

              {/* Content */}
              <div
                className="transition-all duration-300 ease-in-out overflow-hidden"
                style={{
                  maxHeight: openIndex === i ? "500px" : "0px",
                  opacity: openIndex === i ? 1 : 0,
                }}
              >
                <div
                  className="px-6 py-5"
                  style={{ backgroundColor: "rgba(212, 197, 160, 0.6)" }}
                >
                  <p className="text-[var(--color-mh-dark)] text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
