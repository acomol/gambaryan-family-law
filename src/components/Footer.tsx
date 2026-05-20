export default function Footer() {
  return (
    <footer
      className="bg-cargo-dark"
      style={{
        borderTop: "1px solid rgba(255,255,255,0.1)",
        padding: "30px 0",
      }}
    >
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        {/* ---- Desktop: three-column layout ---- */}
        <div className="hidden lg:flex items-center justify-between">
          {/* Left — CARGO */}
          <span
            className="text-white"
            style={{
              fontSize: 32,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            CARGO
          </span>

          {/* Center — credits */}
          <div className="flex flex-col items-center gap-1">
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "#B4B4B4",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              &copy;CARGOARCHITECTURE INC. 2026, TOUS DROITS
              R&Eacute;SERV&Eacute;S.
            </span>
            <a
              href="#"
              className="hover:text-white transition-colors duration-200"
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "#B4B4B4",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              POLITIQUE DE CONFIDENTIALIT&Eacute;
            </a>
            <span
              style={{
                fontSize: 11,
                fontWeight: 400,
                color: "#B4B4B4",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              EXP&Eacute;RIENCE NUM&Eacute;RIQUE R&Eacute;ALIS&Eacute;E PAR
              INSTYNCT
            </span>
          </div>

          {/* Right — ARCHITECTURE */}
          <span
            className="text-white"
            style={{
              fontSize: 32,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            ARCHITECTURE
          </span>
        </div>

        {/* ---- Mobile: stacked layout ---- */}
        <div className="flex flex-col items-center gap-4 lg:hidden">
          {/* Combined brand name on mobile */}
          <span
            className="text-white"
            style={{
              fontSize: 20,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}
          >
            CARGO ARCHITECTURE
          </span>

          {/* Credits */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span
              style={{
                fontSize: 10,
                fontWeight: 400,
                color: "#B4B4B4",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              &copy;CARGOARCHITECTURE INC. 2026, TOUS DROITS
              R&Eacute;SERV&Eacute;S.
            </span>
            <a
              href="#"
              className="hover:text-white transition-colors duration-200"
              style={{
                fontSize: 10,
                fontWeight: 400,
                color: "#B4B4B4",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              POLITIQUE DE CONFIDENTIALIT&Eacute;
            </a>
            <span
              style={{
                fontSize: 9,
                fontWeight: 400,
                color: "#B4B4B4",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              EXP&Eacute;RIENCE NUM&Eacute;RIQUE R&Eacute;ALIS&Eacute;E PAR
              INSTYNCT
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
