import React from "react";
import HeroSection from "../components/home/HeroSection";
import HowItWorks from "../components/home/HowItWorks";
import TechStack from "../components/home/TechStack";
import UseCases from "../components/home/UseCases";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <HowItWorks />
      <TechStack />
      <UseCases />
    </div>
  );
}