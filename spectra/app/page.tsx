"use client";

import Iridescence from "@/components/Iridescence";
import ColorBends from "@/components/ColorBends";
import Noise from "@/components/Noise";
import Aurora from "@/components/Aurora";
import CardSwap, { Card } from "@/components/CardSwap";
import BlurText from "@/components/BlurText";
import CountUp from "@/components/CountUp";
import Magnet from "@/components/Magnet";
import ShinyText from "@/components/ShinyText";
import GradientText from "@/components/GradientText";
import { AnimatedList } from "@/components/ui/animated-list";
import { Marquee } from "@/components/ui/marquee";
import { BorderBeam } from "@/components/ui/border-beam";
import DecryptedText from "@/components/DecryptedText";
import { Particles } from "@/components/ui/particles";
import CardNav, { CardNavItem } from "@/components/CardNav";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  AlertDiamondIcon,
  Shield01Icon,
  ChartHistogramIcon,
  Notification01Icon,
  SlackIcon,
  DiscordIcon,
  TelegramIcon,
  Link01Icon,
  ApiIcon,
  AiBrain01Icon,
  Time01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

// Alert items for the AnimatedList
const alerts: { icon: IconSvgElement; title: string; description: string; time: string; color: string; iconColor: string }[] = [
  {
    icon: Alert02Icon,
    title: "Anomaly Detected",
    description: "Agent-7 exceeded spending limit by 340%",
    time: "Just now",
    color: "bg-red-100",
    iconColor: "text-red-600",
  },
  {
    icon: AlertDiamondIcon,
    title: "Unusual Pattern",
    description: "3 agents making similar transactions",
    time: "2m ago",
    color: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  {
    icon: Shield01Icon,
    title: "Auto-Paused",
    description: "Agent-12 halted after suspicious activity",
    time: "5m ago",
    color: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: ChartHistogramIcon,
    title: "Threshold Breach",
    description: "Daily limit reached for wallet 0x8f...3a",
    time: "8m ago",
    color: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  {
    icon: Notification01Icon,
    title: "New Agent Online",
    description: "Agent-15 connected and monitoring",
    time: "12m ago",
    color: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
];

// Integration/feature items for Marquee
const integrations: { name: string; icon: IconSvgElement }[] = [
  { name: "Slack", icon: SlackIcon },
  { name: "Discord", icon: DiscordIcon },
  { name: "Telegram", icon: TelegramIcon },
  { name: "Webhooks", icon: Link01Icon },
  { name: "API", icon: ApiIcon },
  { name: "ML Detection", icon: AiBrain01Icon },
  { name: "Real-time", icon: Time01Icon },
];

// Navigation items for CardNav
const navItems: CardNavItem[] = [
  {
    label: "Product",
    bgColor: "#0f172a",
    textColor: "#e2e8f0",
    links: [
      { label: "Features", href: "#features", ariaLabel: "View features" },
      { label: "Pricing", href: "#pricing", ariaLabel: "View pricing" },
      { label: "Demo", href: "#demo", ariaLabel: "View demo" },
    ],
  },
  {
    label: "Company",
    bgColor: "#164e63",
    textColor: "#e2e8f0",
    links: [
      { label: "About", href: "#about", ariaLabel: "About us" },
      { label: "Blog", href: "#blog", ariaLabel: "Read our blog" },
      { label: "Careers", href: "#careers", ariaLabel: "View careers" },
    ],
  },
  {
    label: "Resources",
    bgColor: "#312e81",
    textColor: "#e2e8f0",
    links: [
      { label: "Docs", href: "#docs", ariaLabel: "View documentation" },
      { label: "API", href: "#api", ariaLabel: "API reference" },
      { label: "Support", href: "#support", ariaLabel: "Get support" },
    ],
  },
];

export default function Page() {
  return (
    <main className="relative">
      {/* Navbar */}
      <CardNav
        logoText="spectra"
        items={navItems}
        baseColor="rgba(255, 255, 255, 0.1)"
        menuColor="#fff"
        buttonBgColor="#a5f3fc"
        buttonTextColor="#0f172a"
      />

      {/* Hero Section */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full">
          <Iridescence
            color={[0.2, 0.9, 0.95]}
            speed={0.12}
            amplitude={0.05}
            mouseReact={true}
          />
        </div>

        <div className="absolute inset-0 flex items-center" style={{ zIndex: 2 }}>
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text Content */}
            <div>
              <h1 className="text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] tracking-[-0.02em] mb-6 text-white leading-[1.1] font-[600]">
                Agent monitoring,{" "}
                <br className="hidden md:block" />
                made easy with{" "}
<span className="relative inline-block">
                  <GradientText
                    colors={[
                      "#a5f3fc", // cyan
                      "#c4b5fd", // light purple
                      "#fbcfe8", // light pink
                      "#ffffff", // white
                      "#bfdbfe", // light blue
                      "#ddd6fe", // lavender
                      "#fecdd3", // rose
                      "#ffffff", // white
                      "#c4b5fd", // light purple
                    ]}
                    animationSpeed={8}
                    yoyo={false}
                    outline
                  >Spectra</GradientText>
                  {/* Underline */}
                  <span
                    className="absolute left-0 right-0 h-[2px] pointer-events-none rounded-full"
                    style={{
                      top: 'calc(100% + 4px)',
                      backgroundImage: 'linear-gradient(90deg, #a5f3fc, #c4b5fd, #fbcfe8, #ffffff, #bfdbfe, #a5f3fc)',
                    }}
                  />
                </span>
              </h1>
              <p className="text-xl text-white mb-10 max-w-[420px] leading-relaxed font-[600] drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                Know when your agents go rogue — before it's too late.
              </p>
              <Magnet padding={50} magnetStrength={3}>
                <button className="inline-flex items-center gap-2 px-7 py-3.5 bg-cyan-200 text-slate-800 rounded-full text-base font-[600] hover:bg-cyan-100 transition-colors">
                  Get Started
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </Magnet>
            </div>

            {/* Right - Video Player with Glassmorphism */}
            <div className="hidden lg:flex justify-end">
              <div className="relative group">
                {/* Glassmorphism border container */}
                <div className="relative p-[2px] rounded-2xl bg-gradient-to-br from-white/40 via-white/20 to-white/40">
                  {/* Inner glass effect */}
                  <div className="relative w-[480px] aspect-video rounded-xl overflow-hidden bg-slate-900/80 backdrop-blur-sm">
                    {/* Video placeholder - replace src with actual video/gif */}
                    <video
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      poster=""
                    >
                      {/* Add video source here: <source src="/your-video.mp4" type="video/mp4" /> */}
                    </video>

                    {/* Placeholder overlay (remove when video is added) */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/90 to-slate-900/90">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 flex items-center justify-center">
                          <svg className="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </div>
                        <span className="text-sm text-white/40">Video / GIF</span>
                      </div>
                    </div>

                    {/* Glass reflection overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>

                    {/* Animated border beam */}
                    <BorderBeam
                      size={120}
                      duration={8}
                      colorFrom="#22d3ee"
                      colorTo="#a78bfa"
                      borderWidth={2}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats & Features Section - Combined with Noise */}
      <section className="relative w-full bg-slate-50">
        <div className="absolute inset-0 overflow-hidden">
          <Noise patternAlpha={10} animated={false} />
        </div>

        {/* Stats Part */}
        <div className="relative z-10 pt-32 pb-20 max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <div className="text-center">
              <p className="text-5xl md:text-6xl font-medium text-slate-800 mb-2">
                <CountUp to={100} duration={2} separator="," />M+
              </p>
              <p className="text-slate-500">Agent payments processed</p>
            </div>
            <div className="text-center">
              <p className="text-5xl md:text-6xl font-medium text-slate-800 mb-2">
                $<CountUp to={380} duration={2.5} separator="," />K
              </p>
              <p className="text-slate-500">Daily autonomous transactions</p>
            </div>
            <div className="text-center">
              <p className="text-5xl md:text-6xl font-medium text-slate-800 mb-2">
                <CountUp to={0} from={100} direction="down" duration={2} />%
              </p>
              <p className="text-slate-500">Have proper oversight</p>
            </div>
          </div>

          <BlurText
            text="AI agents are spending real money autonomously. One rogue agent = catastrophic loss."
            delay={50}
            animateBy="words"
            direction="bottom"
            className="text-xl md:text-2xl text-slate-600 text-center max-w-2xl mx-auto"
          />
        </div>

        {/* Separator */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12">
          <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
        </div>

        {/* Features Part */}
        <div className="relative z-10 py-24 max-w-7xl mx-auto px-6 md:px-12">
          {/* Gradient Container */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-cyan-200/60 via-blue-100/50 to-violet-200/60 p-12 md:p-16">
            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/20 pointer-events-none"></div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Text */}
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-600 mb-4 font-medium">
                <DecryptedText
                  text="What we solve"
                  animateOn="view"
                  speed={40}
                  sequential={true}
                  revealDirection="start"
                />
              </p>
              <h2 className="text-3xl md:text-5xl font-medium text-slate-800 mb-6 leading-tight">
                Spectra solves your biggest agent oversight challenges
              </h2>
              <p className="text-lg text-slate-500">
                From wallet monitoring to anomaly detection, we automate the entire oversight workflow so you can focus on building great agents.
              </p>
            </div>

            {/* Right - CardSwap */}
            <div className="relative h-[580px] flex items-center justify-center">
              <CardSwap
                width={460}
                height={440}
                cardDistance={60}
                verticalDistance={40}
                delay={3500}
                pauseOnHover={true}
                easing="elastic"
              >
                <Card className="flex flex-col p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                  <span className="text-sm uppercase tracking-widest text-indigo-600 font-semibold mb-3">Monitor</span>
                  <p className="text-slate-600 text-base mb-4">Real-time visibility into every transaction your agents make across all connected wallets.</p>
                  <div className="rounded-xl overflow-hidden bg-gradient-to-br from-indigo-100 to-blue-50 aspect-video flex items-center justify-center">
                    <span className="text-sm text-slate-400">Image</span>
                  </div>
                </Card>

                <Card className="flex flex-col p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                  <span className="text-sm uppercase tracking-widest text-violet-600 font-semibold mb-3">Detect</span>
                  <p className="text-slate-600 text-base mb-4">ML-powered anomaly detection catches rogue behavior in seconds, not hours.</p>
                  <div className="rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-purple-50 aspect-video flex items-center justify-center">
                    <span className="text-sm text-slate-400">Image</span>
                  </div>
                </Card>

                <Card className="flex flex-col p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                  <span className="text-sm uppercase tracking-widest text-cyan-600 font-semibold mb-3">Alert</span>
                  <p className="text-slate-600 text-base mb-4">Instant notifications via Slack, Discord, Telegram, or SMS when thresholds are breached.</p>
                  <div className="rounded-xl overflow-hidden bg-gradient-to-br from-cyan-100 to-sky-50 aspect-video flex items-center justify-center">
                    <span className="text-sm text-slate-400">Image</span>
                  </div>
                </Card>

                <Card className="flex flex-col p-8 bg-white rounded-2xl shadow-xl border border-slate-100">
                  <span className="text-sm uppercase tracking-widest text-emerald-600 font-semibold mb-3">Respond</span>
                  <p className="text-slate-600 text-base mb-4">One-click kill switch to pause rogue agents instantly before damage spreads.</p>
                  <div className="rounded-xl overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-50 aspect-video flex items-center justify-center">
                    <span className="text-sm text-slate-400">Image</span>
                  </div>
                </Card>
              </CardSwap>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Marquee */}
      <section className="relative py-10 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <Aurora
            colorStops={["#1e293b", "#6366f1", "#a5b4fc"]}
            amplitude={1.0}
            blend={0.5}
            speed={0.4}
          />
        </div>
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-6 md:px-12 mb-6">
            <p className="text-center text-sm uppercase tracking-widest text-white/50 font-medium">
              Integrations & Features
            </p>
          </div>
          <Marquee pauseOnHover className="[--duration:30s]">
            {integrations.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-6 py-3 mx-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                <HugeiconsIcon icon={item.icon} className="w-5 h-5 text-cyan-400" />
                <span className="text-white/70 font-medium">{item.name}</span>
              </div>
            ))}
          </Marquee>
          <Marquee reverse pauseOnHover className="[--duration:30s] mt-4">
            {integrations.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-6 py-3 mx-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                <HugeiconsIcon icon={item.icon} className="w-5 h-5 text-cyan-400" />
                <span className="text-white/70 font-medium">{item.name}</span>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* Live Alerts Demo Section */}
      <section className="relative py-24 bg-slate-50 overflow-hidden">
        <Particles
          className="absolute inset-0"
          quantity={60}
          color="#334155"
          size={0.4}
          staticity={40}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-600 mb-4 font-medium">
                <DecryptedText
                  text="Real-time monitoring"
                  animateOn="view"
                  speed={30}
                  sequential={true}
                />
              </p>
              <h2 className="text-3xl md:text-4xl font-medium text-slate-800 mb-6 leading-tight">
                See threats the moment they happen
              </h2>
              <p className="text-lg text-slate-500 mb-8">
                Our ML-powered detection system monitors every transaction in real-time, alerting you instantly when something looks off.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-sm">Sub-second detection</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span className="text-sm">99.9% accuracy</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                  <span className="text-sm">Auto-pause capability</span>
                </div>
              </div>
            </div>

            {/* Right - AnimatedList */}
            <div className="relative h-[400px] overflow-hidden rounded-2xl bg-white/80 border border-slate-200 shadow-xl p-6">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent z-10 pointer-events-none"></div>
              <AnimatedList delay={2000} className="h-full">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm"
                  >
                    <div className={`w-10 h-10 rounded-full ${alert.color} flex items-center justify-center flex-shrink-0`}>
                      <HugeiconsIcon icon={alert.icon} className={`w-5 h-5 ${alert.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-slate-800 font-medium truncate">{alert.title}</p>
                        <span className="text-xs text-slate-400 flex-shrink-0">{alert.time}</span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </AnimatedList>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Aurora */}
      <section className="relative h-[70vh] w-full bg-slate-900 overflow-hidden">
        <Aurora
          colorStops={["#1e293b", "#6366f1", "#a5b4fc"]}
          amplitude={1.0}
          blend={0.5}
          speed={0.4}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <BlurText
            text="Don't wait for the first disaster."
            delay={80}
            animateBy="words"
            direction="top"
            className="text-3xl md:text-5xl font-medium tracking-tight text-white/90 mb-4 text-center"
          />
          <p className="text-lg text-white/50 mb-8 text-center max-w-md">
            Join the waitlist for early access to Spectra.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="you@company.com"
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 text-sm w-64 focus:outline-none focus:border-white/40"
            />
            <Magnet padding={40} magnetStrength={4}>
              <button className="px-6 py-3 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors shadow-lg">
                Join Waitlist
              </button>
            </Magnet>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <p className="text-sm text-white/40">spectra</p>
          <p className="text-sm text-white/40">Built for Solana</p>
        </div>
      </footer>
    </main>
  );
}
