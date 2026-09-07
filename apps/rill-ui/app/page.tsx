import { LandingNav } from "./components/landing-nav";
import { Hero } from "./components/hero";
import { Protocols } from "./components/protocols";
import { HowItWorks } from "./components/how-it-works";
import { Capabilities } from "./components/capabilities";
import { Security } from "./components/security";
import { Showcase } from "./components/showcase";
import { Cta } from "./components/cta";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <LandingNav />
      <Hero />
      <Protocols />
      <HowItWorks />
      <Capabilities />
      <Security />
      <Showcase />
      <Cta />
      <Footer />
    </main>
  );
}