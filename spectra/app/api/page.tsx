"use client";

import { useState } from "react";
import Link from "next/link";
import BlurText from "@/components/BlurText";
import DecryptedText from "@/components/DecryptedText";
import { BorderBeam } from "@/components/ui/border-beam";
import Prism from "@/components/Prism";
import CardNav, { CardNavItem } from "@/components/CardNav";
import CountUp from "@/components/CountUp";

const codeExamples = {
  authentication: `// Authenticate with your API key
const response = await fetch('https://api.spectra.dev/v1/agents', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer sk_live_...',
    'Content-Type': 'application/json'
  }
});

const agents = await response.json();
console.log(agents);`,

  reporting: `// Report a trade via REST API
const trade = await fetch('https://api.spectra.dev/v1/reports', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'agent_8fK3vN2a',
    action: 'swap',
    token: 'SOL',
    amount: 2500,
    confidence: 0.92,
    reasoning: 'Price delta exceeded threshold'
  })
});

const result = await trade.json();`,

  webhooks: `// Configure webhooks for real-time alerts
const webhook = await fetch('https://api.spectra.dev/v1/webhooks', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhooks/spectra',
    events: ['agent.anomaly', 'agent.killed', 'risk.threshold'],
    secret: 'whsec_...'
  })
});`,

  analytics: `// Fetch agent analytics
const analytics = await fetch(
  'https://api.spectra.dev/v1/agents/agent_8fK3vN2a/analytics',
  {
    headers: { 'Authorization': 'Bearer sk_live_...' }
  }
);

const data = await analytics.json();
console.log(data.riskScore);      // 23
console.log(data.classification); // "conservative"
console.log(data.totalTrades);    // 1847`,
};

type TabKey = keyof typeof codeExamples;

const tabs: { key: TabKey; label: string; description: string }[] = [
  { key: "authentication", label: "Authentication", description: "Secure API key authentication" },
  { key: "reporting", label: "Trade Reporting", description: "Submit trades via REST endpoints" },
  { key: "webhooks", label: "Webhooks", description: "Real-time event notifications" },
  { key: "analytics", label: "Analytics", description: "Query agent performance data" },
];

const pricingTiers = [
  {
    name: "Developer",
    price: 0,
    period: "forever",
    description: "Perfect for testing and development",
    features: [
      "1,000 API calls/month",
      "1 agent",
      "Basic analytics",
      "Community support",
      "7-day data retention",
    ],
    cta: "Get Started",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: 49,
    period: "/month",
    description: "For production AI agents",
    features: [
      "100,000 API calls/month",
      "10 agents",
      "Advanced analytics",
      "Webhook integrations",
      "Priority support",
      "30-day data retention",
      "Kill switch API",
    ],
    cta: "Start Free Trial",
    href: "/signup?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: null,
    period: "",
    description: "For teams running at scale",
    features: [
      "Unlimited API calls",
      "Unlimited agents",
      "Custom analytics",
      "Dedicated support",
      "90-day data retention",
      "SLA guarantee",
      "Custom integrations",
      "On-premise option",
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
];

const navItems: CardNavItem[] = [
  {
    label: "Product",
    bgColor: "#0f172a",
    textColor: "#e2e8f0",
    links: [
      { label: "Features", href: "/#features", ariaLabel: "View features" },
      { label: "Dashboard", href: "/dashboard", ariaLabel: "View dashboard" },
      { label: "Demo", href: "/#demo", ariaLabel: "View demo" },
    ],
  },
  {
    label: "Developers",
    bgColor: "#164e63",
    textColor: "#e2e8f0",
    links: [
      { label: "SDK", href: "/sdk", ariaLabel: "View SDK" },
      { label: "API", href: "/api", ariaLabel: "View API" },
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

function highlightSyntax(code: string): string {
  const tokens: { type: string; content: string }[] = [];

  const tokenize = (type: string, content: string) => {
    const idx = tokens.length;
    tokens.push({ type, content });
    return `\u0000_${idx}_\u0000`;
  };

  let result = code
    .replace(/(\/\/.*$)/gm, (m) => tokenize("comment", m))
    .replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, (m) => tokenize("string", m));

  result = result
    .replace(/\b(import|export|from|const|let|var|function|async|await|return|new|if|else|true|false)\b/g, '<span class="text-violet-400">$1</span>')
    .replace(/\b(Response|Promise|Record|Array|string|number|boolean|JSON)\b/g, '<span class="text-cyan-400">$1</span>')
    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="text-cyan-400">$1</span>(')
    .replace(/(?<![-/])\b(\d+\.?\d*)\b/g, '<span class="text-fuchsia-400">$1</span>')
    .replace(/([a-zA-Z_][a-zA-Z0-9_]*):/g, '<span class="text-white/70">$1</span>:');

  result = result.replace(/\u0000_(\d+)_\u0000/g, (_, idx) => {
    const token = tokens[parseInt(idx)];
    if (token.type === "comment") {
      return `<span class="text-white/30">${token.content}</span>`;
    } else if (token.type === "string") {
      return `<span class="text-amber-300">${token.content}</span>`;
    }
    return token.content;
  });

  return result;
}

export default function APIPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("authentication");

  return (
    <main className="relative min-h-screen bg-[#030303] text-white">

      {/* Navigation */}
      <CardNav
        logoText="spectra"
        items={navItems}
        baseColor="rgba(255, 255, 255, 0.1)"
        menuColor="#fff"
        buttonBgColor="#a5f3fc"
        buttonTextColor="#0f172a"
        buttonText="Login"
        buttonHref="/login"
      />

      {/* Hero + Base URL wrapper with Prism background */}
      <div className="relative overflow-hidden">
        {/* Prism background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-70">
          <Prism
            animationType="hover"
            hueShift={0.5}
            colorFrequency={1.5}
            glow={1.2}
            bloom={1.5}
            scale={4}
            noise={0.3}
            hoverStrength={1.5}
            inertia={0.08}
          />
        </div>
        {/* Fade to background */}
        <div className="absolute bottom-0 left-0 right-0 h-64 z-[1] pointer-events-none bg-gradient-to-t from-[#030303] from-10% via-[#030303]/80 via-40% to-transparent" />

        {/* Hero */}
        <section className="relative z-10 pt-36 pb-16 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <BlurText
                text="Spectra API"
                delay={50}
                animateBy="letters"
                direction="top"
                className="text-5xl md:text-7xl font-semibold tracking-tight"
              />
            </div>

            <p className="text-lg text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
              RESTful API for monitoring AI agents at scale. Real-time analytics,
              webhooks, and programmatic control over your entire fleet.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/docs/api"
                className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                API Reference
              </Link>
              <Link
                href="#pricing"
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Base URL */}
        <section className="relative z-10 pb-20 px-8">
          <div className="max-w-xl mx-auto">
            <div className="relative rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
              <BorderBeam size={200} duration={8} />
              <div className="flex items-center justify-between px-5 py-4">
                <code className="text-sm text-white/70 font-mono">
                  <span className="text-white/30">Base URL:</span> https://api.spectra.dev/v1
                </code>
                <button className="text-xs text-white/30 hover:text-white transition-colors">
                  Copy
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* API examples */}
      <section className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <DecryptedText
              text="REST API"
              speed={50}
              className="text-3xl font-semibold tracking-tight mb-4"
            />
            <p className="text-white/40">
              Simple HTTP endpoints for any language or framework
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tabs */}
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    activeTab === tab.key
                      ? "bg-white/[0.05] border border-white/10"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <h3 className={`font-medium mb-1 ${activeTab === tab.key ? "text-white" : "text-white/60"}`}>
                    {tab.label}
                  </h3>
                  <p className="text-sm text-white/30">{tab.description}</p>
                </button>
              ))}
            </div>

            {/* Code block */}
            <div className="lg:col-span-2 relative rounded-xl bg-[#0a0a0a] border border-white/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <span className="ml-2 text-xs text-white/20 font-mono">request.js</span>
              </div>
              <pre className="p-6 text-sm font-mono overflow-x-auto text-white/70 leading-relaxed max-h-[400px]">
                <code dangerouslySetInnerHTML={{ __html: highlightSyntax(codeExamples[activeTab]) }} />
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-16 px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 99.9, suffix: "%", label: "Uptime SLA" },
              { value: 50, suffix: "ms", label: "Avg Response" },
              { value: 10, suffix: "M+", label: "API Calls/Day" },
              { value: 500, suffix: "+", label: "Active Teams" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-3xl md:text-4xl font-semibold mb-2">
                  <CountUp
                    from={0}
                    to={stat.value}
                    duration={2}
                    separator=","
                  />
                  <span className="text-cyan-400">{stat.suffix}</span>
                </div>
                <p className="text-sm text-white/40">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <DecryptedText
              text="API Pricing"
              speed={50}
              className="text-3xl font-semibold tracking-tight mb-4"
            />
            <p className="text-white/40 max-w-xl mx-auto">
              Simple, transparent pricing that scales with your usage. Start free and upgrade as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingTiers.map((tier, idx) => (
              <div
                key={idx}
                className={`relative p-6 rounded-2xl transition-all ${
                  tier.highlighted
                    ? "bg-gradient-to-b from-cyan-500/10 to-transparent border-2 border-cyan-500/30"
                    : "bg-white/[0.02] border border-white/10 hover:border-white/20"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-black text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <p className="text-sm text-white/40 mb-4">{tier.description}</p>

                <div className="mb-6">
                  {tier.price !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${tier.price}</span>
                      <span className="text-white/40">{tier.period}</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-bold">Custom</div>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-sm text-white/60">
                      <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`block w-full py-3 rounded-lg font-medium text-center transition-colors ${
                    tier.highlighted
                      ? "bg-cyan-500 text-black hover:bg-cyan-400"
                      : "bg-white/5 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "RESTful Design",
                description: "Standard HTTP methods with predictable, resource-oriented URLs.",
              },
              {
                title: "JSON Responses",
                description: "All responses are JSON with consistent error handling patterns.",
              },
              {
                title: "Rate Limiting",
                description: "Generous limits with clear headers showing your usage.",
              },
              {
                title: "Webhook Events",
                description: "Subscribe to real-time events for anomalies and alerts.",
              },
              {
                title: "Idempotent Requests",
                description: "Safe retries with idempotency keys for critical operations.",
              },
              {
                title: "Versioned API",
                description: "Stable endpoints with versioning for backwards compatibility.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-6 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors"
              >
                <h3 className="text-white font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-8 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">
            Ready to integrate?
          </h2>
          <p className="text-white/40 mb-8">
            Get your API key and start monitoring your agents in minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Get API Key
            </Link>
            <Link
              href="/docs/api"
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-white/20">Spectra API</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              Docs
            </Link>
            <Link href="/sdk" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              SDK
            </Link>
            <Link href="/support" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
