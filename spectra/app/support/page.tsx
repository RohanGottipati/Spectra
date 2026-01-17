"use client";

import { useState } from "react";
import Link from "next/link";
import Aurora from "@/components/Aurora";
import BlurText from "@/components/BlurText";
import Magnet from "@/components/Magnet";
import CardNav, { CardNavItem } from "@/components/CardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
      { label: "Support", href: "/support", ariaLabel: "Get support" },
    ],
  },
];

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <main className="relative min-h-screen w-full bg-slate-900 overflow-hidden">
      <Aurora
        colorStops={["#1e293b", "#6366f1", "#a5b4fc"]}
        amplitude={1.0}
        blend={0.5}
        speed={0.4}
      />
      
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

      {/* Contact Form Section */}
      <section className="relative h-[calc(100vh-80px)] w-full flex items-center justify-center px-6">
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 max-w-2xl mx-auto w-full">
          <BlurText
            text="Get in touch with our team"
            delay={80}
            animateBy="words"
            direction="top"
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-white/90 mb-6 text-center whitespace-nowrap"
          />
          <p className="text-xl text-white/50 mb-10 text-center max-w-lg">
            Have a question or need help? We're here to assist you.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5">
            <div className="flex gap-4">
              <Input
                type="text"
                name="name"
                placeholder="Your name"
                value={formData.name}
                onChange={handleChange}
                required
                className="px-5 py-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 text-base focus:outline-none focus:border-white/40 flex-1"
              />
            </div>

            <div className="flex gap-4">
              <Input
                type="email"
                name="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="px-5 py-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 text-base focus:outline-none focus:border-white/40 flex-1"
              />
            </div>

            <div className="flex gap-4">
              <Select
                value={formData.subject}
                onValueChange={(value) =>
                  setFormData({ ...formData, subject: value ?? "" })
                }
                required
              >
                <SelectTrigger className="px-5 py-4 bg-white/10 border border-white/20 rounded-lg text-white text-base focus:outline-none focus:border-white/40 flex-1">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border border-white/20 text-white">
                  <SelectItem value="general" className="focus:bg-slate-700">
                    General Inquiry
                  </SelectItem>
                  <SelectItem value="technical" className="focus:bg-slate-700">
                    Technical Support
                  </SelectItem>
                  <SelectItem value="billing" className="focus:bg-slate-700">
                    Billing Question
                  </SelectItem>
                  <SelectItem value="security" className="focus:bg-slate-700">
                    Security Issue
                  </SelectItem>
                  <SelectItem value="feature" className="focus:bg-slate-700">
                    Feature Request
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Textarea
                name="message"
                placeholder="Your message..."
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="px-5 py-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 text-base focus:outline-none focus:border-white/40 resize-none w-full"
              />
            </div>

            <div className="flex justify-center pt-3">
              <Magnet padding={40} magnetStrength={4}>
                <button
                  type="submit"
                  className="px-8 py-4 bg-white text-slate-900 rounded-lg text-base font-medium hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  Send Message
                </button>
              </Magnet>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 bg-slate-900 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 px-6">
          <p className="text-sm text-white/50">© 2026 Spectra. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-white/50">
            <Link href="/" className="hover:text-white/80 transition-colors">
              Privacy
            </Link>
            <Link href="/" className="hover:text-white/80 transition-colors">
              Terms
            </Link>
            <Link href="/support" className="hover:text-white/80 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
