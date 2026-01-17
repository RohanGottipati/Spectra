"use client";

import Aurora from "@/components/Aurora";
import BlurText from "@/components/BlurText";
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

export default function WaitlistPage() {
  return (
    <main className="relative min-h-screen bg-slate-900 text-white flex flex-col overflow-hidden">
      {/* Dynamic background mirroring the main page CTA */}
      <Aurora
        colorStops={["#1e293b", "#6366f1", "#a5b4fc"]}
        amplitude={1.0}
        blend={0.5}
        speed={0.4}
      />

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

      <section className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl text-center space-y-6">
          <div className="text-sm uppercase tracking-[0.2em] text-cyan-200">Waitlist</div>
          <BlurText
            text="Join the Spectra waitlist"
            delay={70}
            animateBy="words"
            direction="top"
            className="text-3xl md:text-4xl font-semibold tracking-tight text-white text-center justify-center"
          />
          <p className="text-base text-white/70">
            Get early access to Spectra. Drop your email and we&apos;ll reach out with launch updates.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              name="email"
              required
              placeholder="you@company.com"
              className="w-full sm:w-auto flex-1 rounded-lg px-4 py-3 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-white/40"
            />
            <button
              type="submit"
              className="rounded-lg px-6 py-3 bg-white text-slate-900 font-medium hover:bg-cyan-50 transition-colors shadow-lg"
            >
              Join waitlist
            </button>
          </form>
          <p className="text-xs text-white/40">No spam — just a heads up when we launch.</p>
        </div>
      </section>

      {/* Footer (copied exactly from main page) */}
      <footer className="py-8 bg-slate-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">spectra</p>
          <p className="text-sm text-white/40">Built for UOttaHack 8 × <span style={{ fontFamily: "'Orbitron', sans-serif" }}>Solana</span></p>
          <div className="flex items-center gap-2 text-white/40">
            <span className="text-lg">◎</span>
            <span className="text-sm">Powered by <span style={{ fontFamily: "'Orbitron', sans-serif" }}>Solana</span></span>
          </div>
        </div>
      </footer>
    </main>
  );
}

