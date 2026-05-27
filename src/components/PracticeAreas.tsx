"use client";

const AREAS = [
  {
    title: "Car Accidents",
    desc: "Aggressive representation for victims of negligent drivers across Alabama.",
  },
  {
    title: "Truck Accidents",
    desc: "Holding trucking companies accountable for devastating 18-wheeler crashes.",
  },
  {
    title: "Motorcycle Accidents",
    desc: "Protecting riders who suffer serious injuries due to others' negligence.",
  },
  {
    title: "Rideshare & Delivery",
    desc: "Navigating complex liability in Uber, Lyft, and delivery vehicle accidents.",
  },
  {
    title: "Catastrophic Injury",
    desc: "Maximum compensation for life-altering injuries including TBI and spinal cord damage.",
  },
  {
    title: "Pedestrian Accidents",
    desc: "Justice for pedestrians struck by careless or distracted drivers.",
  },
  {
    title: "Premises Liability",
    desc: "Slip and fall, unsafe conditions, and negligent property maintenance claims.",
  },
  {
    title: "Product Liability",
    desc: "Holding manufacturers responsible for defective and dangerous products.",
  },
  {
    title: "Other Vehicle Accidents",
    desc: "Boats, ATVs, golf carts, and all other vehicle-related injuries.",
  },
  {
    title: "Workplace Accidents",
    desc: "Construction site injuries, industrial accidents, and employer negligence.",
  },
  {
    title: "Injury Types",
    desc: "Burns, broken bones, soft tissue, nerve damage, and wrongful death.",
  },
  {
    title: "Personal Injury",
    desc: "Comprehensive personal injury representation from consultation to verdict.",
  },
];

export default function PracticeAreas() {
  return (
    <section className="bg-[var(--color-mh-dark)] py-16 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left sidebar */}
          <div className="lg:col-span-4 xl:col-span-3">
            <h2
              className="font-serif italic text-white mb-4"
              style={{ fontSize: "clamp(28px, 3vw, 40px)", lineHeight: 1.15 }}
            >
              Major Areas of Personal Injury Law
            </h2>
            {/* Gold underline */}
            <div className="w-16 h-[3px] bg-[var(--color-mh-gold)] mb-6" />
            <p className="text-white/70 text-sm leading-relaxed">
              McCutcheon &amp; Hamner handles all types of personal injury cases
              across North Alabama. Our team has the resources and experience to
              take on the biggest insurance companies and win.
            </p>
          </div>

          {/* Right grid */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
              {AREAS.map((area) => (
                <div key={area.title} className="group cursor-pointer">
                  {/* Gold top line */}
                  <div className="h-[2px] bg-[var(--color-mh-gold)] opacity-60 group-hover:opacity-100 transition-opacity mb-4" />
                  <h4
                    className="font-narrow font-bold text-[var(--color-mh-gold)] uppercase tracking-wide mb-2 group-hover:text-[var(--color-mh-gold-light)] transition-colors"
                    style={{ fontSize: 14 }}
                  >
                    {area.title}
                  </h4>
                  <p className="text-white/60 text-xs leading-relaxed">
                    {area.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
