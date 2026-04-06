import Constants from "expo-constants";
import { BellRing, Cpu, Shield, Sparkles } from "lucide-react-native";
import React from "react";
import { AboutFeatureList, type AboutFeatureItem } from "../../components/about/about-feature-list";
import { AboutFooterCard } from "../../components/about/about-footer-card";
import { AboutIntroCard } from "../../components/about/about-intro-card";
import { StackScreenScaffold } from "../../components/layout";
import { SectionHeading } from "../../components/ui/section-heading";
import { NornColors } from "@/theme";

const AboutScreen = () => {
  const displayVersion = Constants.expoConfig?.version ?? "2.0.0";

  const features: readonly AboutFeatureItem[] = [
    {
      key: "live",
      icon: Sparkles,
      iconBg: "bg-violet-50",
      iconBorder: "border-violet-200/80",
      iconColor: "#7C3AED",
      title: "Live activity",
      body:
        "The clip tracks motion. Your timeline and mascot match what the sensor sees.",
    },
    {
      key: "fall",
      icon: Shield,
      iconBg: "bg-orange-50",
      iconBorder: "border-orange-100",
      iconColor: NornColors.brandOrange,
      title: "Fall safety",
      body:
        "Alerts for falls, near-falls, and shaky balance, with clear severity so you know what to do next.",
    },
    {
      key: "link",
      icon: Cpu,
      iconBg: "bg-sky-50",
      iconBorder: "border-sky-200/70",
      iconColor: "#0284C7",
      title: "Clip and phone",
      body:
        "Live or offline status, last signal, and sensor details in one place. Works with your home Wi-Fi setup.",
    },
    {
      key: "alerts",
      icon: BellRing,
      iconBg: "bg-amber-50",
      iconBorder: "border-amber-200/80",
      iconColor: "#D97706",
      title: "Smart alerts",
      body:
        "Fall notifications, a simple inbox, and quick ways to get help when it counts.",
    },
  ];

  return (
    <StackScreenScaffold
      hero={{
        title: "About NORN",
        subtitle: "Version, features, and the ideas behind the app.",
      }}
    >
      <AboutIntroCard version={displayVersion} />

      <SectionHeading
        className="mt-10"
        eyebrow="Product"
        title="What makes it tick"
        description="Four things we focus on."
      />

      <AboutFeatureList items={features} />

      <AboutFooterCard />
    </StackScreenScaffold>
  );
};

export default AboutScreen;
