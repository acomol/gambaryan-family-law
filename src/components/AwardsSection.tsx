import AnimateIn from "@/components/AnimateIn";

interface Award {
  year: string;
  project: string;
  details: string;
}

const AWARDS: Award[] = [
  {
    year: "2021",
    project: "USINE DE CHARPENTES MONTMORENCY",
    details: "PRIX D'EXCELLENCE CECOBOIS — Nomine, Batiment industrielle",
  },
  {
    year: "2021",
    project: "JDHM — SIEGE SOCIAL",
    details: "PRIX D'EXCELLENCE CECOBOIS — Nomine, Concept structural",
  },
  {
    year: "2021",
    project: "SIEGE SOCIAL DE OIKOS",
    details: "PRIX D'EXCELLENCE CECOBOIS — Nomine, Batiment commercial",
  },
  {
    year: "2019",
    project: "LE CAMPE, REFUGE LOCATIF",
    details: "PRIX NOBILIS — Laureat, Maisons neuves",
  },
  {
    year: "2018",
    project: "PLAZA IA",
    details:
      "MERITES DE L'ARCHITECTURE VILLE DE QUEBEC — Laureat, Enseigne exterieure",
  },
  {
    year: "2017",
    project: "PAVILLON DES TOURS DE LA POINTE",
    details: "PRIX D'EXCELLENCE CECOBOIS — Laureat, Details architecturaux",
  },
  {
    year: "2015",
    project: "PAVILLON DES TOURS DE LA POINTE",
    details: "PRIX INOV — Laureat",
  },
];

export default function AwardsSection() {
  return (
    <section
      id="prix"
      className="bg-cargo-dark"
      style={{ padding: "100px 0" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left column — text + CTA */}
          <AnimateIn variant="fade-up" className="lg:col-span-5 flex flex-col gap-10">
            <p
              className="text-white"
              style={{
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              Nous sommes fiers des recompenses et distinctions recues au fil
              des annees. Ces reconnaissances temoignent de notre engagement
              envers l&rsquo;excellence et l&rsquo;innovation en architecture.
            </p>

            <a
              href="#contact"
              className="inline-flex items-center self-start border border-white text-white hover:bg-white hover:text-cargo-dark transition-colors duration-300"
              style={{
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "12px 26px",
              }}
            >
              DEBUTER VOTRE PROJET
            </a>
          </AnimateIn>

          {/* Right column — awards table */}
          <AnimateIn variant="fade-up" delay={0.2} className="lg:col-span-7">
            {AWARDS.map((award, idx) => (
              <div
                key={`${award.year}-${award.project}-${idx}`}
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.15)",
                  ...(idx === AWARDS.length - 1
                    ? { borderBottom: "1px solid rgba(255,255,255,0.15)" }
                    : {}),
                  padding: "16px 0",
                }}
              >
                {/* Desktop: 3-column row */}
                <div
                  className="hidden md:grid items-start gap-4"
                  style={{
                    gridTemplateColumns: "60px 1fr 1fr",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#B4B4B4",
                    }}
                  >
                    {award.year}
                  </span>

                  <span
                    className="text-white"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      lineHeight: 1.4,
                    }}
                  >
                    {award.project}
                  </span>

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      color: "#B4B4B4",
                      lineHeight: 1.5,
                    }}
                  >
                    {award.details}
                  </span>
                </div>

                {/* Mobile: stacked layout */}
                <div className="flex flex-col gap-1 md:hidden">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: "#B4B4B4",
                    }}
                  >
                    {award.year}
                  </span>

                  <span
                    className="text-white"
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      lineHeight: 1.4,
                    }}
                  >
                    {award.project}
                  </span>

                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 400,
                      color: "#B4B4B4",
                      lineHeight: 1.5,
                    }}
                  >
                    {award.details}
                  </span>
                </div>
              </div>
            ))}
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
