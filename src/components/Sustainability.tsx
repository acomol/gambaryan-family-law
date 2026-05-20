import AnimateIn from "@/components/AnimateIn";

export default function Sustainability() {
  return (
    <section
      className="bg-white-section"
      style={{ padding: "100px 0" }}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left column — large intro text */}
          <AnimateIn variant="fade-up">
            <p
              style={{
                fontSize: 26,
                fontWeight: 500,
                color: "#1D1D1D",
                lineHeight: 1.5,
              }}
            >
              CARGOarchitecture s&rsquo;engage &agrave; des solutions durables,
              minimisant les impacts environnementaux de la construction &agrave;
              la r&eacute;utilisation. Avec l&rsquo;analyse du cycle de vie
              (ACV), nous optimisons les ressources et r&eacute;duisons les
              d&eacute;chets, cr&eacute;ant des b&acirc;timents
              &eacute;cologiques pour les g&eacute;n&eacute;rations futures.
            </p>
          </AnimateIn>

          {/* Right column — body text */}
          <AnimateIn variant="fade-up" delay={0.2}>
            <p
              style={{
                fontSize: 16,
                fontWeight: 400,
                color: "#1D1D1D",
                lineHeight: 1.7,
              }}
            >
              L&rsquo;analyse du cycle de vie (ACV) &eacute;value l&rsquo;impact
              environnemental d&rsquo;un b&acirc;timent de sa conception &agrave;
              sa d&eacute;molition. En mesurant les &eacute;missions de carbone,
              la consommation d&rsquo;&eacute;nergie et l&rsquo;utilisation des
              ressources &agrave; chaque &eacute;tape, l&rsquo;ACV aide &agrave;
              identifier des opportunit&eacute;s pour r&eacute;duire
              l&rsquo;empreinte &eacute;cologique globale du projet.
            </p>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
