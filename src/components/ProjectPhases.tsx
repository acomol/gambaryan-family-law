const phases = [
  {
    num: "00",
    title: "ÉTUDES PRÉCONCEPTUELLES",
    desc: "Étape préparatoire qui permet de comprendre et documenter les besoins et les fonctions d’un bâtiment en vue d’établir son ampleur.",
  },
  {
    num: "01",
    title: "ESQUISSE DU PROJET",
    desc: "Cette étape englobe l’examen du site, la revue du programme, la conception des premières esquisses, ainsi qu’une analyse budgétaire sommaire.",
  },
  {
    num: "02",
    title: "PROJET PRÉLIMINAIRE",
    desc: "Une fois les esquisses validées, nous développons le projet plus en détail, en élaborant les plans sommaires, coupes et élévations nécessaires.",
  },
  {
    num: "03",
    title: "PROJET DÉFINITIF",
    desc: "C’est l’élaboration proprement dite des plans techniques, devis et documents nécessaires pour l’obtention des permis.",
  },
  {
    num: "04",
    title: "APPEL D’OFFRES",
    desc: "Nous assistons le client dans le processus de sélection des entrepreneurs et la négociation des contrats de construction.",
  },
  {
    num: "05",
    title: "SURVEILLANCE DE CHANTIER",
    desc: "Administration et surveillance des travaux de construction pour assurer la conformité aux plans et devis.",
  },
];

export default function ProjectPhases() {
  return (
    <section
      id="approche"
      className="bg-cargo-dark"
      style={{ padding: "100px 0" }}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        {/* Header: title + CTA button */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ marginBottom: 64 }}
        >
          <h2
            className="text-white"
            style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15 }}
          >
            Les phases d&rsquo;un projet
          </h2>

          <a
            href="#contact"
            className="inline-block shrink-0 text-white transition-colors duration-200 hover:bg-white hover:text-cargo-dark"
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              border: "1px solid #FFFFFF",
              padding: "14px 28px",
              backgroundColor: "transparent",
            }}
          >
            D&eacute;buter votre projet
          </a>
        </div>

        {/* Phase rows */}
        <div>
          {phases.map((phase, i) => (
            <div key={phase.num}>
              {/* Top border line */}
              <div className="line-light" />

              <div
                className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8"
                style={{ padding: "28px 0" }}
              >
                {/* Number */}
                <div className="lg:col-span-1">
                  <span style={{ fontSize: 14, color: "#B4B4B4" }}>
                    {phase.num}
                  </span>
                </div>

                {/* Title */}
                <div className="lg:col-span-3">
                  <span
                    className="text-white"
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {phase.title}
                  </span>
                </div>

                {/* Description */}
                <div className="lg:col-span-8">
                  <p style={{ fontSize: 14, color: "#B4B4B4", lineHeight: 1.6 }}>
                    {phase.desc}
                  </p>
                </div>
              </div>

              {/* Bottom border on last row */}
              {i === phases.length - 1 && <div className="line-light" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
