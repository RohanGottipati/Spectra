"use client";

import Iridescence from "@/components/Iridescence";
import Noise from "@/components/Noise";
import Aurora from "@/components/Aurora";
import CardSwap, { Card } from "@/components/CardSwap";

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
              <div className="relative aspect-video rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-800" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">Product Demo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Text Content */}
            <div className="order-1 lg:order-2 lg:pl-8">
              <p className="text-sm uppercase tracking-widest text-white/80 mb-4 drop-shadow-sm">
                AI Agent Monitoring for Solana
              </p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6 drop-shadow-lg">
                spectra
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-8 max-w-md drop-shadow-sm">
                Know when your agents go rogue — before it's too late.
              </p>
              <div className="flex gap-4">
                <button className="px-6 py-3 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors shadow-lg">
                  Get Early Access
                </button>
                <button className="px-6 py-3 border border-white/50 text-white rounded-lg text-sm font-medium hover:bg-white/10 transition-colors backdrop-blur-sm">
                  Learn More
                </button>
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
              <p className="text-5xl md:text-6xl font-medium text-slate-800 mb-2">100M+</p>
              <p className="text-slate-500">Agent payments processed</p>
            </div>
            <div className="text-center">
              <p className="text-5xl md:text-6xl font-medium text-slate-800 mb-2">$380K</p>
              <p className="text-slate-500">Daily autonomous transactions</p>
            </div>
            <div className="text-center">
              <p className="text-5xl md:text-6xl font-medium text-slate-800 mb-2">0%</p>
              <p className="text-slate-500">Have proper oversight</p>
            </div>
          </div>

          <p className="text-xl md:text-2xl text-slate-600 text-center max-w-2xl mx-auto">
            AI agents are spending real money autonomously.
            <span className="text-slate-800 font-medium"> One rogue agent = catastrophic loss.</span>
          </p>
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
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">1</span>
                  Connect your agents
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">2</span>
                  Set guardrails & thresholds
                </li>
                <li className="flex items-center gap-3 text-slate-600">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-medium">3</span>
                  Monitor & respond in real-time
                </li>
              </ul>
            </div>

            {/* Right - CardSwap */}
            <div className="relative h-[450px] flex items-center justify-center">
              <CardSwap
                width={400}
                height={260}
                cardDistance={50}
                verticalDistance={35}
                delay={3000}
                pauseOnHover={true}
                easing="elastic"
              >
                <Card className="flex flex-col justify-center p-8 bg-gradient-to-br from-blue-100 via-indigo-100 to-violet-200 border-white/50 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center mb-4 shadow-sm">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-800 mb-2">Monitor</h3>
                  <p className="text-sm text-slate-600">Real-time visibility into every transaction your agents make.</p>
                </Card>

                <Card className="flex flex-col justify-center p-8 bg-gradient-to-br from-violet-100 via-purple-100 to-fuchsia-200 border-white/50 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center mb-4 shadow-sm">
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-800 mb-2">Detect</h3>
                  <p className="text-sm text-slate-600">Anomaly detection catches rogue behavior in seconds.</p>
                </Card>

                <Card className="flex flex-col justify-center p-8 bg-gradient-to-br from-cyan-100 via-sky-100 to-blue-200 border-white/50 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center mb-4 shadow-sm">
                    <svg className="w-6 h-6 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-800 mb-2">Alert</h3>
                  <p className="text-sm text-slate-600">Instant notifications via Slack, Discord, or SMS.</p>
                </Card>

                <Card className="flex flex-col justify-center p-8 bg-gradient-to-br from-teal-100 via-emerald-100 to-cyan-200 border-white/50 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center mb-4 shadow-sm">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-800 mb-2">Respond</h3>
                  <p className="text-sm text-slate-600">One-click kill switch to pause agents instantly.</p>
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
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight text-white/90 mb-4 text-center">
            Don't wait for the first disaster.
          </h2>
          <p className="text-lg text-white/50 mb-8 text-center max-w-md">
            Join the waitlist for early access to Spectra.
          </p>
          <div className="flex gap-3">
            <input
              type="email"
              placeholder="you@company.com"
              className="px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 text-sm w-64 focus:outline-none focus:border-white/40"
            />
            <button className="px-6 py-3 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-white/90 transition-colors">
              Join Waitlist
            </button>
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
