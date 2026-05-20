"use client";

const SERVICES = [
  {
    title: "Services en Architecture",
    intro:
      "CARGOarchitecture offre une gamme élargie de services professionnels en architecture avec une approche proactive du design intégré",
    items: [
      "Développement de projets",
      "Conception et production des plans et devis",
      "Gestion de la modélisation BIM",
      "Stratégies réglementaires",
      "Design urbain",
      "Visualisation 3D",
      "Service et gestion durant la construction",
    ],
    cta: { label: "VOIR LES PROJETS", href: "#projets" },
  },
  {
    title: "Services en Design d’intérieur",
    intro:
      "Notre équipe de design d’intérieur offre des services complémentaires en aménagement, du concept à la réalisation",
    items: [
      "Aménagement intérieur",
      "Design de mobilier sur mesure",
      "Sélection de matériaux et finis",
      "Plans d’aménagement détaillés",
      "Coordination avec les entrepreneurs",
      "Suivi de chantier",
    ],
    cta: { label: "TOUS LES PROJETS", href: "#projets" },
  },
  {
    title: "Services en Planification et Expertise",
    intro:
      "CARGOarchitecture accompagne ses clients dans la planification stratégique et l’expertise technique de leurs projets",
    items: [
      "Études de faisabilité",
      "Programmation fonctionnelle et technique",
      "Expertise de bâtiment",
      "Analyse de conditions existantes",
      "Évaluation de coûts",
      "Planification stratégique immobilière",
    ],
    cta: null,
  },
] as const;

const PROJECT_PHOTOS = [
  { src: "/images/project-jdhm.jpg", alt: "Projet JDHM" },
  {
    src: "/images/project-design-interieur.jpg",
    alt: "Projet design d’intérieur",
  },
  { src: "/images/project-cietech.jpg", alt: "Projet Cietech" },
] as const;

export default function ServiceCards() {
  return (
    <section id="services" className="bg-cargo-gray" style={{ padding: "40px 0 100px" }}>
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        {/* ---------- Staggered cards grid ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {SERVICES.map((service, idx) => (
            <div key={service.title} className="flex">
              <div className="w-full flex flex-col">
                {/* Stagger spacer — visible only md+ */}
                <div
                  className="hidden md:block shrink-0"
                  style={{ height: idx * 60 }}
                  aria-hidden
                />

                {/* Card */}
                <div
                  className="flex-1 flex flex-col"
                  style={{
                    backgroundColor: "#FFFFFF",
                    color: "#1D1D1D",
                    padding: 40,
                    borderRadius: 2,
                  }}
                >
                  {/* Title */}
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 20,
                    }}
                  >
                    {service.title}
                  </h3>

                  {/* Intro */}
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.6,
                      marginBottom: 24,
                      color: "#3E3E3E",
                    }}
                  >
                    {service.intro}
                  </p>

                  {/* Bullet list */}
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      marginBottom: service.cta ? 32 : 0,
                    }}
                  >
                    {service.items.map((item) => (
                      <li
                        key={item}
                        style={{
                          fontSize: 15,
                          lineHeight: 1.5,
                          paddingTop: 8,
                          paddingBottom: 8,
                          borderBottom: "1px solid rgba(29,29,29,0.1)",
                        }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* CTA link */}
                  {service.cta && (
                    <div style={{ marginTop: "auto", paddingTop: 8 }}>
                      <a
                        href={service.cta.href}
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#1D1D1D",
                          textDecoration: "none",
                          borderBottom: "1.5px solid transparent",
                          transition: "border-color 0.2s ease",
                          paddingBottom: 2,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "#1D1D1D";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "transparent";
                        }}
                      >
                        {service.cta.label}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Project photos row ---------- */}
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ marginTop: 80, gap: 4 }}
        >
          {PROJECT_PHOTOS.map((photo) => (
            <div key={photo.src} className="aspect-square overflow-hidden">
              <img
                src={photo.src}
                alt={photo.alt}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
