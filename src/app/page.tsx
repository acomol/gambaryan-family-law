import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FirmIntro from "@/components/FirmIntro";
import ServiceCards from "@/components/ServiceCards";
import ProjectPhases from "@/components/ProjectPhases";
import Sustainability from "@/components/Sustainability";
import FullWidthPhoto from "@/components/FullWidthPhoto";
import TeamSection from "@/components/TeamSection";
import AwardsSection from "@/components/AwardsSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FirmIntro />
        <ServiceCards />
        <ProjectPhases />
        <Sustainability />
        <FullWidthPhoto />
        <TeamSection />
        <AwardsSection />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
