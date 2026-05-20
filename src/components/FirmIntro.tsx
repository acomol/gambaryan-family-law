import AnimateIn from "@/components/AnimateIn";

export default function FirmIntro() {
  return (
    <section
      id="firme"
      className="bg-cargo-gray"
      style={{ padding: "100px 0" }}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left column — firm description */}
          <AnimateIn variant="fade-up" className="lg:col-span-7">
            <p
              className="text-white"
              style={{
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              CARGOarchitecture rassemble une &eacute;quipe de professionnels
              talentueux, comprenant des architectes exp&eacute;riment&eacute;s,
              des techniciens sp&eacute;cialis&eacute;s en b&acirc;timent et des
              designers d&rsquo;int&eacute;rieur. Notre approche proactive et
              collaborative se distingue par une communication ouverte et une
              prise de d&eacute;cision collective. CARGOarchitecture incarne une
              image forte qui refl&egrave;te de belle fa&ccedil;on notre
              pratique&nbsp;: c&rsquo;est le transport, le partage de
              connaissances et le mouvement d&rsquo;id&eacute;es dans une
              direction commune.
            </p>
          </AnimateIn>

          {/* Right column — origin story + founder photo */}
          <AnimateIn variant="fade-up" delay={0.2} className="lg:col-span-5 flex flex-col gap-8">
            <p
              style={{
                fontSize: 16,
                fontStyle: "italic",
                lineHeight: 1.65,
                color: "#B4B4B4",
              }}
            >
              Fond&eacute;e en 2006 &agrave; Toronto sous le nom de CGBWstudio
              par Charles-Bernard Gagnon et relocalis&eacute;e &agrave;
              Qu&eacute;bec en 2008, la firme s&rsquo;est d&eacute;marqu&eacute;e
              sur le march&eacute; de la grande r&eacute;gion de Qu&eacute;bec
              gr&acirc;ce &agrave; sa philosophie et &agrave; sa volont&eacute;
              d&rsquo;offrir un service professionnel personnalis&eacute;.
            </p>

            {/* Founder photo */}
            <div>
              <img
                src="/images/founder-charles.jpg"
                alt="Charles-Bernard Gagnon, Architecte Fondateur"
                className="w-full object-cover"
                style={{
                  maxHeight: 400,
                  borderRadius: 4,
                }}
              />

              {/* Caption */}
              <div style={{ marginTop: 16 }}>
                <p
                  className="text-white"
                  style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}
                >
                  Charles-Bernard Gagnon
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#B4B4B4",
                    lineHeight: 1.4,
                  }}
                >
                  Architecte Fondateur, OAQ
                </p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
