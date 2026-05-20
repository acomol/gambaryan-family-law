"use client";

import { useState } from "react";
import AnimateIn from "@/components/AnimateIn";

interface TeamMember {
  number: string;
  name: string;
  role: string;
  bio: string;
}

const TEAM: TeamMember[] = [
  {
    number: "01",
    name: "Charles-Bernard Gagnon",
    role: "Architecte Directeur | OAQ, DPLG, AIBC",
    bio: "Fondateur de CARGOarchitecture, Charles-Bernard dirige la vision architecturale de la firme depuis 2006. Son parcours international et sa double certification (France et Canada) apportent une perspective unique a chaque projet.",
  },
  {
    number: "02",
    name: "Nicolas Harvey",
    role: "Architecte | OAQ",
    bio: "Nicolas apporte une rigueur technique et une sensibilite conceptuelle qui enrichissent chaque projet. Membre de l'OAQ, il veille a l'excellence de la conception et a la conformite reglementaire.",
  },
  {
    number: "03",
    name: "Gabriel Morissette",
    role: "Technicien Senior",
    bio: "Avec une vaste experience en documentation technique, Gabriel assure la precision et la qualite des plans de construction. Son expertise est essentielle a la realisation de projets complexes.",
  },
  {
    number: "04",
    name: "Guillaume Dion-Marin",
    role: "Chef Technique",
    bio: "Guillaume coordonne les aspects techniques des projets, de la conception a la realisation. Sa maitrise des systemes constructifs garantit des solutions efficaces et durables.",
  },
  {
    number: "05",
    name: "Jean-Philippe Lavoie",
    role: "Technicien en architecture",
    bio: "Jean-Philippe contribue a la production des dessins d'architecture et aux details constructifs, assurant la coherence entre la vision conceptuelle et les exigences techniques.",
  },
  {
    number: "06",
    name: "Katia Foucault-Lemieux",
    role: "Design d'interieur",
    bio: "Katia cree des espaces interieurs fonctionnels et esthetiques qui repondent aux besoins des utilisateurs tout en refletant l'identite de chaque projet.",
  },
  {
    number: "07",
    name: "Antoine Farley",
    role: "Technicien Senior",
    bio: "Antoine met a profit son experience approfondie en dessin technique pour produire des documents de construction precis et complets, facilitant une execution sans faille.",
  },
  {
    number: "08",
    name: "Felix Andres Castro",
    role: "Dessinateur en batiment",
    bio: "Felix participe a l'elaboration des dessins techniques et des modeles 3D, contribuant a la clarte et a la precision de la documentation de projet.",
  },
  {
    number: "09",
    name: "Sophie Cote",
    role: "Gestionnaire de bureau",
    bio: "Sophie assure la coordination administrative et operationnelle du bureau, permettant a l'equipe de se concentrer pleinement sur la creation architecturale.",
  },
  {
    number: "10",
    name: "David Gosselin",
    role: "Stagiaire en architecture",
    bio: "David apporte un regard neuf et une energie creative a l'equipe. Son stage lui permet de developper ses competences tout en contribuant activement aux projets en cours.",
  },
  {
    number: "11",
    name: "Justine L'Herault",
    role: "Architecte | OAQ",
    bio: "Justine allie creativite et precision technique dans chaque projet. Membre de l'OAQ, elle apporte une attention particuliere aux details et a la qualite spatiale.",
  },
  {
    number: "12",
    name: "Maxim Boutin",
    role: "Technicien en architecture",
    bio: "Maxim contribue a la realisation technique des projets avec methodologie et rigueur, assurant la qualite des livrables a chaque etape.",
  },
  {
    number: "13",
    name: "Audrey Cloutier-Lacasse",
    role: "Designer d'interieur",
    bio: "Audrey concoit des ambiances interieures harmonieuses et fonctionnelles, integrant materiaux, couleurs et eclairage pour creer des espaces de vie exceptionnels.",
  },
];

export default function TeamSection() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (num: string) => {
    setExpanded((prev) => (prev === num ? null : num));
  };

  return (
    <section
      id="equipe"
      className="bg-white-section"
      style={{ padding: "100px 0" }}
    >
      <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
        {/* Intro paragraph */}
        <AnimateIn variant="fade-up">
        <p
          style={{
            fontSize: 18,
            fontWeight: 400,
            lineHeight: 1.65,
            color: "#1D1D1D",
            maxWidth: 800,
            marginBottom: 60,
          }}
        >
          Chez CARGOarchitecture, notre equipe est notre plus grand atout.
          Composee de professionnels talentueux aux competences variees, elle
          reunit une diversite d&rsquo;experiences. Chaque membre apporte son
          expertise unique pour offrir des solutions innovantes et de haute
          qualite.
        </p>
        </AnimateIn>

        {/* Team list */}
        <div>
          {TEAM.map((member) => {
            const isOpen = expanded === member.number;
            return (
              <div
                key={member.number}
                style={{
                  borderTop: "1px solid rgba(29,29,29,0.15)",
                  ...(member.number === "13"
                    ? { borderBottom: "1px solid rgba(29,29,29,0.15)" }
                    : {}),
                }}
              >
                {/* Row */}
                <button
                  type="button"
                  onClick={() => toggle(member.number)}
                  className="w-full text-left cursor-pointer"
                  style={{ padding: "20px 0" }}
                  aria-expanded={isOpen}
                  aria-controls={`bio-${member.number}`}
                >
                  {/* Desktop: 4-column grid (number | name | role | icon) */}
                  <div
                    className="hidden md:grid items-center"
                    style={{
                      gridTemplateColumns: "60px 1fr 1fr 40px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#B4B4B4",
                      }}
                    >
                      {member.number}
                    </span>

                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#1D1D1D",
                      }}
                    >
                      {member.name}
                    </span>

                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: "#B4B4B4",
                      }}
                    >
                      {member.role}
                    </span>

                    <span
                      className="flex items-center justify-center"
                      style={{
                        fontSize: 22,
                        fontWeight: 400,
                        color: "#1D1D1D",
                        transition: "transform 0.3s ease",
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                  </div>

                  {/* Mobile: 3-column grid (number | name | icon), no role */}
                  <div
                    className="grid md:hidden items-center"
                    style={{
                      gridTemplateColumns: "48px 1fr 40px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "#B4B4B4",
                      }}
                    >
                      {member.number}
                    </span>

                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#1D1D1D",
                      }}
                    >
                      {member.name}
                    </span>

                    <span
                      className="flex items-center justify-center"
                      style={{
                        fontSize: 22,
                        fontWeight: 400,
                        color: "#1D1D1D",
                        transition: "transform 0.3s ease",
                        transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                  </div>
                </button>

                {/* Expanded bio */}
                <div
                  id={`bio-${member.number}`}
                  role="region"
                  style={{
                    overflow: "hidden",
                    maxHeight: isOpen ? 200 : 0,
                    opacity: isOpen ? 1 : 0,
                    transition:
                      "max-height 0.35s ease, opacity 0.25s ease",
                    paddingLeft: 60,
                    paddingRight: 40,
                  }}
                >
                  <p
                    style={{
                      fontSize: 16,
                      fontWeight: 400,
                      lineHeight: 1.65,
                      color: "#3E3E3E",
                      paddingBottom: 20,
                    }}
                  >
                    {member.bio}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
