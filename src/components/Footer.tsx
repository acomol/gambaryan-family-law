"use client";

const PRACTICE_AREAS = [
  "Car Accidents",
  "Truck Accidents",
  "Motorcycle Accidents",
  "Rideshare & Delivery",
  "Catastrophic Injury",
  "Pedestrian Accidents",
  "Premises Liability",
  "Product Liability",
  "Other Vehicle Accidents",
  "Workplace Accidents",
];

const QUICK_LINKS = [
  "Personal Injury",
  "Water Contamination",
  "Wills for Warriors",
  "The Firm",
  "Videos",
  "Insights",
  "Contact Us",
  "Offices",
  "Testimonials",
];

const SOCIAL = [
  { name: "Instagram", icon: "○" },
  { name: "YouTube", icon: "□" },
  { name: "Facebook", icon: "f" },
  { name: "X", icon: "X" },
];

const OFFICES = [
  {
    city: "Huntsville",
    address: "200 West Side Square, Suite 1000",
    state: "Huntsville, AL 35801",
    phone: "(256) 448-8523",
  },
  {
    city: "Florence",
    address: "116 N. Court Street",
    state: "Florence, AL 35630",
    phone: "(256) 333-5000",
  },
  {
    city: "Athens",
    address: "321 S. Marion Street",
    state: "Athens, AL 35611",
    phone: "(256) 616-6616",
  },
];

export default function Footer() {
  return (
    <footer className="bg-[var(--color-mh-dark)]">
      {/* Main footer */}
      <div className="py-12 lg:py-16">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Column 1 — Practice Areas */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-5">
                AREAS OF PRACTICE
              </h4>
              <ul className="space-y-2">
                {PRACTICE_AREAS.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/60 text-sm hover:text-[var(--color-mh-gold)] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2 — Quick Links */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-5">
                QUICK LINKS
              </h4>
              <ul className="space-y-2">
                {QUICK_LINKS.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/60 text-sm hover:text-[var(--color-mh-gold)] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Follow Us */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-[0.2em] mb-5">
                FOLLOW US
              </h4>
              <ul className="space-y-3">
                {SOCIAL.map((s) => (
                  <li key={s.name}>
                    <a
                      href="#"
                      className="flex items-center gap-3 text-white/60 text-sm hover:text-[var(--color-mh-gold)] transition-colors"
                    >
                      <span className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-xs">
                        {s.icon}
                      </span>
                      {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gold V-shape separator */}
      <div className="relative h-8">
        <svg
          viewBox="0 0 1440 32"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 L720,32 L1440,0"
            fill="none"
            stroke="var(--color-mh-gold)"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Bottom footer — offices */}
      <div className="py-12 lg:py-16 border-t border-white/5">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
          {/* MH branding */}
          <div className="text-center mb-10">
            <span className="font-heading text-white text-xl uppercase tracking-[0.15em]">
              McCutcheon &amp; Hamner
            </span>
            <p className="text-[var(--color-mh-gold)] text-xs uppercase tracking-wider mt-1">
              Personal Injury Attorneys
            </p>
          </div>

          {/* Offices grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {OFFICES.map((office) => (
              <div key={office.city}>
                <h5 className="text-white font-bold text-sm uppercase tracking-wide mb-2">
                  {office.city}
                </h5>
                <p className="text-white/50 text-xs mb-1">{office.address}</p>
                <p className="text-white/50 text-xs mb-2">{office.state}</p>
                <a
                  href={`tel:${office.phone.replace(/[^0-9]/g, "")}`}
                  className="text-[var(--color-mh-gold)] text-sm font-semibold hover:text-[var(--color-mh-gold-light)] transition-colors"
                >
                  {office.phone}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright bar */}
      <div className="py-5 border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs">
            Copyright &copy; 2026 McCutcheon &amp; Hamner. All Rights Reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            {["SITE MAP", "PRIVACY", "TERMS", "AI POLICY", "ACCESSIBILITY"].map(
              (link) => (
                <a
                  key={link}
                  href="#"
                  className="text-white/40 hover:text-white/70 uppercase tracking-wider transition-colors"
                >
                  {link}
                </a>
              ),
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
