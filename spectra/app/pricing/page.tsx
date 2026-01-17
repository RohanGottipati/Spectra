"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import LightRays from "@/components/LightRays";
import ElectricBorder from "@/components/ElectricBorder";
import CardNav, { CardNavItem } from "@/components/CardNav";

const navItems: CardNavItem[] = [
  {
    label: "Product",
    bgColor: "#0f172a",
    textColor: "#e2e8f0",
    links: [
      { label: "Dashboard", href: "/dashboard", ariaLabel: "View dashboard" },
      { label: "Waitlist", href: "/waitlist", ariaLabel: "Join the waitlist" },
      { label: "Pricing", href: "/pricing", ariaLabel: "View pricing" },
    ],
  },
  {
    label: "Developers",
    bgColor: "#164e63",
    textColor: "#e2e8f0",
    links: [
      { label: "SDK", href: "/sdk", ariaLabel: "View SDK" },
      { label: "Docs", href: "/docs", ariaLabel: "View documentation" },
    ],
  },
  {
    label: "Resources",
    bgColor: "#312e81",
    textColor: "#e2e8f0",
    links: [
      { label: "GitHub", href: "https://github.com", ariaLabel: "View GitHub" },
      { label: "Discord", href: "#discord", ariaLabel: "Join Discord" },
      { label: "Support", href: "/support", ariaLabel: "Get support" },
    ],
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for testing and small projects",
    features: [
      { text: "Up to 3 agents", included: true },
      { text: "1,000 transactions/month", included: true },
      { text: "Basic anomaly detection", included: true },
      { text: "Email alerts", included: true },
      { text: "7-day data retention", included: true },
      { text: "Community support", included: true },
      { text: "Advanced ML detection", included: false },
      { text: "Real-time Slack/Discord", included: false },
      { text: "Custom guardrails", included: false },
      { text: "API access", included: false },
      { text: "Priority support", included: false },
    ],
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "month",
    description: "For serious trading operations",
    features: [
      { text: "Up to 25 agents", included: true },
      { text: "100,000 transactions/month", included: true },
      { text: "Advanced ML anomaly detection", included: true },
      { text: "Real-time Slack/Discord/Telegram", included: true },
      { text: "30-day data retention", included: true },
      { text: "Custom guardrails & limits", included: true },
      { text: "API access", included: true },
      { text: "Email priority support", included: true },
      { text: "Webhook integrations", included: true },
      { text: "Multi-wallet monitoring", included: true },
      { text: "Advanced analytics", included: false },
    ],
    buttonText: "Start Free Trial",
    buttonVariant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For institutions and high-volume traders",
    features: [
      { text: "Unlimited agents", included: true },
      { text: "Unlimited transactions", included: true },
      { text: "Enterprise ML detection", included: true },
      { text: "All integrations", included: true },
      { text: "Unlimited data retention", included: true },
      { text: "Custom SLA & uptime", included: true },
      { text: "Full API access", included: true },
      { text: "Dedicated support", included: true },
      { text: "Custom integrations", included: true },
      { text: "Advanced analytics & reporting", included: true },
      { text: "On-premise deployment", included: true },
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const,
    popular: false,
  },
];

const faqItems = [
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately."
  },
  {
    question: "What happens if I exceed my transaction limit?",
    answer: "We'll notify you when you're approaching your limit. You can upgrade your plan or wait until the next billing cycle."
  },
  {
    question: "Do you offer discounts for annual plans?",
    answer: "Yes, contact us for annual billing discounts and custom enterprise pricing."
  },
  {
    question: "Is there a free trial?",
    answer: "All plans start with a 14-day free trial. No credit card required for the free plan."
  }
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 text-center mb-12">
          Frequently asked questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqItems.map((faq, index) => (
            <div
              key={index}
              className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-xl flex flex-col min-h-[120px]"
              onClick={() => toggleFAQ(index)}
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex-1 leading-snug">
                    {faq.question}
                  </h3>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    className={`w-5 h-5 text-slate-600 transition-transform flex-shrink-0 mt-0.5 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out flex-1 ${
                    openIndex === index ? 'max-h-96 mt-2' : 'max-h-0'
                  }`}
                >
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800">
      {/* Navbar */}
      <CardNav
        logoText="spectra"
        items={navItems}
        baseColor="rgba(255, 255, 255, 0.1)"
        menuColor="#fff"
        buttonBgColor="#a5f3fc"
        buttonTextColor="#0f172a"
        buttonText="Login"
        buttonHref="/login"
        hideOnScroll={true}
      />

      <main className="relative z-10">
        {/* Light Rays Background */}
        <div style={{ width: '100%', height: '900px', position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 0 }}>
          <LightRays
            raysOrigin="top-center"
            raysColor="#7df9ff"
            raysSpeed={1.2}
            lightSpread={0.85}
            rayLength={1.8}
            followMouse={true}
            mouseInfluence={0.25}
            noiseAmount={0.05}
            distortion={0.02}
            saturation={1.0}
            fadeDistance={1.0}
            className="custom-rays"
          />
        </div>

        {/* Hero Section */}
        <section className="pt-32 pb-12 px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-slate-600 mb-2">
              Choose the plan that fits your trading operation
            </p>
            <p className="text-lg text-slate-500">
              All plans include core monitoring features. Upgrade as you scale.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 px-6 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => (
                <ElectricBorder
                  key={plan.name}
                  color="#22d3ee"
                  speed={0.7}
                  chaos={0.08}
                  borderRadius={16}
                  className="electric-pricing-card"
                  style={{ borderRadius: 16 }}
                >
                  <Card
                    className={`relative h-full flex flex-col bg-slate-900/60 backdrop-blur-xl border-0 shadow-xl rounded-[16px] overflow-hidden ${
                      plan.popular ? "" : ""
                    }`}
                    style={{ borderRadius: 16, border: 'none' }}
                  >
                    
                    <CardHeader className="pb-4 pt-5 px-5">
                    <CardTitle className="text-xl font-bold text-white mb-2">
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      <span className="text-3xl font-bold text-white">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-slate-400 text-sm">/{plan.period}</span>
                      )}
                    </div>
                    <CardDescription className="text-slate-300 text-sm leading-relaxed">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col pb-5 px-5">
                    <div className="space-y-2.5 mb-5 flex-1">
                      {plan.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5"
                        >
                          {feature.included ? (
                            <div className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-400/40">
                              <HugeiconsIcon
                                icon={Tick02Icon}
                                className="w-2.5 h-2.5 text-cyan-400"
                                strokeWidth={2.5}
                              />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-slate-700/50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-600/50">
                              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                            </div>
                          )}
                          <span
                            className={`text-xs leading-relaxed ${
                              feature.included
                                ? "text-slate-200"
                                : "text-slate-500 line-through"
                            }`}
                          >
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={plan.buttonVariant}
                      className={`w-full mt-auto ${
                        plan.popular
                          ? "bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-lg"
                          : plan.buttonVariant === "outline"
                          ? "bg-white/90 text-slate-900 hover:bg-white border-0 font-semibold shadow-md"
                          : "bg-white text-slate-900 hover:bg-slate-100 font-semibold"
                      }`}
                    >
                      {plan.buttonText}
                    </Button>
                  </CardContent>
                  </Card>
                </ElectricBorder>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-600">© 2026 Spectra. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/" className="hover:text-slate-800 transition-colors">
              Privacy
            </Link>
            <Link href="/" className="hover:text-slate-800 transition-colors">
              Terms
            </Link>
            <Link href="/" className="hover:text-slate-800 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}