"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  AlertDiamondIcon,
  Shield01Icon,
  ChartHistogramIcon,
  Notification01Icon,
  AiBrain01Icon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import LightRays from "@/components/LightRays";
import ElectricBorder from "@/components/ElectricBorder";

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

export default function PricingPage() {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-800">
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-lg shadow-black/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="font-semibold text-lg text-slate-800">
            spectra
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-slate-800 font-medium">
              Pricing
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Dashboard
            </Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-800 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Light Rays Background */}
        <div style={{ width: '100%', height: '600px', position: 'absolute', top: '80px', left: 0, pointerEvents: 'none', zIndex: 0 }}>
          <LightRays
            raysOrigin="top-center"
            raysColor="#00ffff"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
            className="custom-rays"
          />
        </div>

        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 relative z-10">
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
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <ElectricBorder
                  key={plan.name}
                  color={plan.popular ? "#7df9ff" : "#c084fc"}
                  speed={1}
                  chaos={0.5}
                  borderRadius={16}
                >
                  <Card
                    className={`relative h-full flex flex-col ${
                      plan.popular
                        ? ""
                        : ""
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <CardHeader className="pb-6">
                    <CardTitle className="text-2xl font-bold text-slate-800 mb-2">
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-slate-800">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-slate-500">/{plan.period}</span>
                      )}
                    </div>
                    <CardDescription className="text-slate-600 text-base">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <div className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3"
                        >
                          {feature.included ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <HugeiconsIcon
                                icon={Tick02Icon}
                                className="w-3.5 h-3.5 text-emerald-600"
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                            </div>
                          )}
                          <span
                            className={`text-sm ${
                              feature.included
                                ? "text-slate-700"
                                : "text-slate-400 line-through"
                            }`}
                          >
                            {feature.text}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant={plan.buttonVariant}
                      className={`w-full ${
                        plan.popular
                          ? "bg-slate-900 text-white hover:bg-slate-800"
                          : plan.buttonVariant === "outline"
                          ? "bg-white/70 backdrop-blur-xl border border-slate-200 text-slate-800 hover:bg-white/90"
                          : ""
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

        {/* Features Comparison */}
        <section className="py-16 px-6 bg-white/50 relative z-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
              Everything you need to monitor AI agents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
                  <HugeiconsIcon
                    icon={ChartHistogramIcon}
                    className="w-6 h-6 text-cyan-600"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Real-time Monitoring
                </h3>
                <p className="text-slate-600">
                  Track every transaction, swap, and trade across all your Solana agents in real-time.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center mb-4">
                  <HugeiconsIcon
                    icon={AlertDiamondIcon}
                    className="w-6 h-6 text-rose-600"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Anomaly Detection
                </h3>
                <p className="text-slate-600">
                  ML-powered detection spots unusual patterns and rogue behavior before it's too late.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-4">
                  <HugeiconsIcon
                    icon={Notification01Icon}
                    className="w-6 h-6 text-emerald-600"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Instant Alerts
                </h3>
                <p className="text-slate-600">
                  Get notified via Slack, Discord, Telegram, or email when agents breach limits.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <HugeiconsIcon
                    icon={Shield01Icon}
                    className="w-6 h-6 text-violet-600"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  Kill Switch
                </h3>
                <p className="text-slate-600">
                  Instantly pause or stop any agent with one click when anomalies are detected.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-6 relative z-10">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-800 text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Can I change plans later?
                </h3>
                <p className="text-slate-600">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  What happens if I exceed my transaction limit?
                </h3>
                <p className="text-slate-600">
                  We'll notify you when you're approaching your limit. You can upgrade your plan or wait until the next billing cycle.
                </p>
              </div>

              <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Do you offer discounts for annual plans?
                </h3>
                <p className="text-slate-600">
                  Yes, contact us for annual billing discounts and custom enterprise pricing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-600">© 2024 Spectra. All rights reserved.</p>
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