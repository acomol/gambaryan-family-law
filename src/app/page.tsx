import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MediaLogos from "@/components/MediaLogos";
import ReviewsTicker from "@/components/ReviewsTicker";
import AwardsBadges from "@/components/AwardsBadges";
import WelcomeSection from "@/components/WelcomeSection";
import NeverSettleLess from "@/components/NeverSettleLess";
import RealResults from "@/components/RealResults";
import CarAccidentLawyers from "@/components/CarAccidentLawyers";
import ContactForm from "@/components/ContactForm";
import AttorneysSection from "@/components/AttorneysSection";
import PracticeAreas from "@/components/PracticeAreas";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <MediaLogos />
        <ReviewsTicker />
        <AwardsBadges />
        <WelcomeSection />
        <NeverSettleLess />
        <RealResults />
        <CarAccidentLawyers />
        <ContactForm />
        <AttorneysSection />
        <PracticeAreas />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
