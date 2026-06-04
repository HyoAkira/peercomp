import React from "react";
import NavbarComponent from "../components/navbar";
import HeroSection from "../components/hero";
import FeaturesSection from "../components/features";
import FooterComponent from "../components/footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <NavbarComponent />

      <main className="flex-1">
        {/* HERO */}
        <HeroSection />

        {/* FEATURES */}
        <FeaturesSection />

        {/* FOOTER */}
        <FooterComponent />
      </main>
    </div>
  );
}
