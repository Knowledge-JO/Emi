import { Capabilities } from "./components/capabilities";
import { Cta } from "./components/cta";
import { Footer } from "./components/footer";
import { Hero } from "./components/hero";
import { HowItWorks } from "./components/how-it-works";
import { LandingNav } from "./components/landing-nav";
import { LiquidField } from "./components/liquid-field";
import { Protocols } from "./components/protocols";
import { Security } from "./components/security";
import { Showcase } from "./components/showcase";

export default function Home() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col">
      <LiquidField />
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <LandingNav />
        <Hero />
        <Protocols />
        <HowItWorks />
        <Capabilities />
        <Security />
        <Showcase />
        <Cta />
        <Footer />
      </div>
    </main>
  );
}
