"use client";

import Iridescence from "@/components/Iridescence";
import Noise from "@/components/Noise";
import Aurora from "@/components/Aurora";
import CardSwap, { Card } from "@/components/CardSwap";
import BlurText from "@/components/BlurText";
import CountUp from "@/components/CountUp";
import Magnet from "@/components/Magnet";
import ShinyText from "@/components/ShinyText";

export default function Page() {
  return (
    <main className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <Iridescence
            color={[0.2, 0.9, 0.95]}
            speed={0.12}
            amplitude={0.05}
            mouseReact={true}
          />
        </div>

        <div className="absolute inset-0 flex items-center">
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left - Video/GIF Placeholder */}
            <div className="order-2 lg:order-1">
              <div className="relative aspect-video rounded-2xl bg-white/30 backdrop-blur-md border border-white/50 overflow-hidden shadow-2xl hover:bg-white/40 transition-colors cursor-pointer group">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Product Demo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Text Content */}
            <div className="order-1 lg:order-2 lg:pl-8">
              <p className="text-sm uppercase tracking-widest text-white/80 mb-4 drop-shadow-sm">
                AI Agent Monitoring for Solana
              </p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 drop-shadow-lg">
                <ShinyText
                  text="spectra"
                  speed={3}
                  color="#ffffff"
                  shineColor="#22d3ee"
                  className="text-4xl md:text-6xl lg:text-7xl font-semibold"
                />
              </h1>
              <BlurText
                text="Know when your agents go rogue — before it's too late."
                delay={100}
                animateBy="words"
                direction="bottom"
                className="text-lg md:text-xl text-white/90 mb-8 max-w-md drop-shadow-sm"
              />
              <div className="flex gap-4">
                <Magnet padding={50} magnetStrength={3}>
                  <button className="px-6 py-3 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-cyan-50 transition-colors shadow-lg border border-cyan-200">
                    Get Early Access
                  </button>
                </Magnet>
                <Magnet padding={50} magnetStrength={3}>
                  <button className="px-6 py-3 border border-white/50 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-sm">
                    Learn More
                  </button>
                </Magnet>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Noisy White */}
      <section className="relative py-32 w-full bg-slate-50">
        <div className="absolute inset-0 overflow-hidden">
          <Noise patternAlpha={10} animated={false} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
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
      </section>

      {/* Features Section with CardSwap */}
      <section className="relative py-32 w-full bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Text */}
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-400 mb-4">
                How it works
              </p>
              <h2 className="text-3xl md:text-5xl font-medium text-slate-800 mb-6">
                Real-time control tower for AI agents
              </h2>
              <p className="text-lg text-slate-500 mb-8">
                Connect your agent wallets, set guardrails, and get instant alerts when behavior deviates from normal.
              </p>
              <ul className="space-y-4">
                {[
                  "Connect your agents",
                  "Set guardrails & thresholds",
                  "Monitor & respond in real-time"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-600">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right - CardSwap */}
            <div className="relative h-[550px] flex items-center justify-center">
              <CardSwap
                width={480}
                height={320}
                cardDistance={60}
                verticalDistance={40}
                delay={3000}
                pauseOnHover={true}
                easing="elastic"
              >
                <Card className="flex flex-col justify-center p-10 bg-gradient-to-br from-blue-100 via-indigo-100 to-violet-200 border-white/50 shadow-xl">
                  <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center mb-5 shadow-sm">
                    <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium text-slate-800 mb-3">Monitor</h3>
                  <p className="text-base text-slate-600">Real-time visibility into every transaction your agents make.</p>
                </Card>

                <Card className="flex flex-col justify-center p-10 bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-200 border-white/50 shadow-xl">
                  <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center mb-5 shadow-sm">
                    <svg className="w-7 h-7 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium text-slate-800 mb-3">Detect</h3>
                  <p className="text-base text-slate-600">Anomaly detection catches rogue behavior in seconds.</p>
                </Card>

                <Card className="flex flex-col justify-center p-10 bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-200 border-white/50 shadow-xl">
                  <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center mb-5 shadow-sm">
                    <svg className="w-7 h-7 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium text-slate-800 mb-3">Alert</h3>
                  <p className="text-base text-slate-600">Instant notifications via Slack, Discord, or SMS.</p>
                </Card>

                <Card className="flex flex-col justify-center p-10 bg-gradient-to-br from-teal-100 via-emerald-100 to-cyan-200 border-white/50 shadow-xl">
                  <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center mb-5 shadow-sm">
                    <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-medium text-slate-800 mb-3">Respond</h3>
                  <p className="text-base text-slate-600">One-click kill switch to pause agents instantly.</p>
                </Card>
              </CardSwap>
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
