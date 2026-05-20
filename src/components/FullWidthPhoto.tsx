import Parallax from "@/components/Parallax";

export default function FullWidthPhoto() {
  return (
    <section>
      <Parallax
        src="/images/office-atelier.jpg"
        alt="Atelier CARGOarchitecture"
        className="w-full"
        speed={0.15}
        style={{ height: "70vh" }}
      />
    </section>
  );
}
