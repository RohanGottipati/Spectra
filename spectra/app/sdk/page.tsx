"use client";

import { useState } from "react";
import Link from "next/link";
import BlurText from "@/components/BlurText";
import DecryptedText from "@/components/DecryptedText";
import { BorderBeam } from "@/components/ui/border-beam";
import LightPillar from "@/components/LightPillar";
import CardNav, { CardNavItem } from "@/components/CardNav";

const codeExamples = {
  quickstart: `import { Spectra, Agent } from 'spectra-sdk';

// Initialize the client
const spectra = new Spectra({
  apiKey: process.env.SPECTRA_API_KEY
});

// Register your agent
const agent = new Agent({
  name: "trading-bot-01",
  strategy: "arbitrage",
  wallet: "8fK3...vN2a"
});

// Start monitoring
spectra.monitor(agent);`,

  reporting: `// Report trades as they happen
spectra.report({
  agent: agent,
  action: "swap",
  token: "SOL",
  amount: 2500,
  confidence: 0.92,
  reasoning: "Price delta exceeded threshold"
});

// Check behavior classification
const status = await spectra.getStatus(agent);
console.log(status.classification); // "conservative"
console.log(status.riskScore);      // 23`,

  killswitch: `// Configure kill switch
spectra.setKillSwitch({
  agent: agent,
  triggers: {
    riskScore: 85,
    lossThreshold: 0.1,
    anomalyCount: 3
  },
  action: async () => {
    await agent.pause();
    await spectra.alert("Agent paused: risk threshold");
  }
});

// Manual kill switch
if (spectra.shouldKill(agent)) {
  agent.pause();
}`,

  fleet: `// Monitor multiple agents
const fleet = new Fleet({
  agents: [botA, botB, botC],
  dashboard: true
});

// Fleet-wide rules
fleet.setRules({
  maxTotalExposure: 100000,
  correlationLimit: 0.7,
  sharedKillSwitch: true
});

// Get fleet analytics
const analytics = await fleet.getAnalytics();
console.log(analytics.totalTrades);
console.log(analytics.avgRiskScore);`,
};

type TabKey = keyof typeof codeExamples;

const tabs: { key: TabKey; label: string; description: string }[] = [
  { key: "quickstart", label: "Quick Start", description: "Get up and running in minutes" },
  { key: "reporting", label: "Trade Reporting", description: "Report and classify agent behavior" },
  { key: "killswitch", label: "Kill Switch", description: "Automated safety controls" },
  { key: "fleet", label: "Fleet Management", description: "Monitor multiple agents" },
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
      { label: "Docs", href: "/docs", ariaLabel: "View documentation" },
      { label: "API Reference", href: "/docs/api", ariaLabel: "API reference" },
    ],
  },
  {
    label: "Resources",
    bgColor: "#312e81",
    textColor: "#e2e8f0",
    links: [
      { label: "GitHub", href: "https://github.com", ariaLabel: "View GitHub" },
      { label: "Discord", href: "#discord", ariaLabel: "Join Discord" },
      { label: "Support", href: "#support", ariaLabel: "Get support" },
    ],
  },
];

// Syntax highlighter for TypeScript/JavaScript
// Uses token-based approach to prevent regex from matching inside already-highlighted HTML
function highlightSyntax(code: string): string {
  const tokens: { type: string; content: string }[] = [];

  // Replace with placeholder to protect from further regex processing
  // Use underscores around the index to prevent word boundaries (so numbers regex won't match)
  const tokenize = (type: string, content: string) => {
    const idx = tokens.length;
    tokens.push({ type, content });
    return `\u0000_${idx}_\u0000`;
  };

  // First pass: extract comments and strings (protected from further processing)
  let result = code
    .replace(/(\/\/.*$)/gm, (m) => tokenize("comment", m))
    .replace(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g, (m) => tokenize("string", m));

  // Second pass: apply other highlighting (won't touch placeholders)
  result = result
    // Keywords
    .replace(/\b(import|export|from|const|let|var|function|async|await|return|new|if|else|true|false)\b/g, '<span class="text-violet-400">$1</span>')
    // Types and classes
    .replace(/\b(Spectra|Agent|Fleet|Promise|Record|Array|string|number|boolean)\b/g, '<span class="text-cyan-400">$1</span>')
    // Function calls (word followed by parenthesis)
    .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="text-cyan-400">$1</span>(')
    // Numbers (negative lookbehind to skip numbers in class names like -400 or /70)
    .replace(/(?<![-/])\b(\d+\.?\d*)\b/g, '<span class="text-fuchsia-400">$1</span>')
    // Object keys
    .replace(/([a-zA-Z_][a-zA-Z0-9_]*):/g, '<span class="text-white/70">$1</span>:')
    // process.env
    .replace(/process\.env\.[A-Z_]+/g, '<span class="text-green-400">$&</span>');

  // Third pass: restore tokens with their highlighted HTML
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

export default function SDKPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("quickstart");

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

      {/* Hero + Install wrapper with LightPillar background */}
      <div className="relative overflow-hidden">
        {/* LightPillar background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <LightPillar
            topColor="#8b5cf6"
            bottomColor="#06b6d4"
            intensity={0.8}
            rotationSpeed={0.2}
            glowAmount={0.004}
            pillarWidth={2.5}
            pillarHeight={0.3}
            noiseIntensity={0.3}
          />
        </div>
        {/* Fade to background - separate layer */}
        <div className="absolute bottom-0 left-0 right-0 h-64 z-[1] pointer-events-none bg-gradient-to-t from-[#030303] from-10% via-[#030303]/80 via-40% to-transparent" />

        {/* Hero */}
        <section className="relative z-10 pt-36 pb-16 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
              <span className="text-xs text-white/40">v1.0.0</span>
              <span className="text-xs text-violet-400">Now Available</span>
            </div>

            <div className="flex justify-center mb-6">
              <BlurText
                text="Spectra SDK"
                delay={50}
                animateBy="letters"
                direction="top"
                className="text-5xl md:text-7xl font-semibold tracking-tight"
              />
            </div>

            <p className="text-lg text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
              Monitor your AI agents with a few lines of code. Real-time behavioral analysis,
              anomaly detection, and automated kill switches.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/docs/quickstart"
                className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="https://github.com"
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-colors"
              >
                View on GitHub
              </Link>
            </div>
          </div>
        </section>

        {/* Install command */}
        <section className="relative z-10 pb-20 px-8">
          <div className="max-w-xl mx-auto">
            <div className="relative rounded-xl bg-white/[0.02] border border-white/10 overflow-hidden">
              <BorderBeam size={200} duration={8} />
              <div className="flex items-center justify-between px-5 py-4">
                <code className="text-sm text-white/70 font-mono">
                  <span className="text-white/30">$</span> npm install spectra-sdk
                </code>
                <button className="text-xs text-white/30 hover:text-white transition-colors">
                  Copy
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Code examples */}
      <section className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <DecryptedText
              text="Simple Integration"
              speed={50}
              className="text-3xl font-semibold tracking-tight mb-4"
            />
            <p className="text-white/40">
              Everything you need to monitor your agents
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
                <span className="ml-2 text-xs text-white/20 font-mono">index.ts</span>
              </div>
              <pre className="p-6 text-sm font-mono overflow-x-auto text-white/70 leading-relaxed max-h-[400px]">
                <code dangerouslySetInnerHTML={{ __html: highlightSyntax(codeExamples[activeTab]) }} />
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Real-time Monitoring",
                description: "Track every trade, decision, and behavioral pattern as it happens.",
              },
              {
                title: "Anomaly Detection",
                description: "Automatic classification: conservative, aggressive, or rogue.",
              },
              {
                title: "Kill Switch API",
                description: "Programmatically pause agents when thresholds are exceeded.",
              },
              {
                title: "Fleet Management",
                description: "Monitor multiple agents with unified dashboards and rules.",
              },
              {
                title: "Webhook Alerts",
                description: "Get notified via Slack, Discord, or custom webhooks.",
              },
              {
                title: "TypeScript Native",
                description: "Full type safety with comprehensive TypeScript definitions.",
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
            Ready to get started?
          </h2>
          <p className="text-white/40 mb-8">
            Join teams using Spectra to monitor their AI agents.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/docs"
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Read the Docs
            </Link>
            <Link
              href="/signup"
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm text-white/20">Spectra SDK</span>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              Docs
            </Link>
            <Link href="https://github.com" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              GitHub
            </Link>
            <Link href="/discord" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              Discord
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
