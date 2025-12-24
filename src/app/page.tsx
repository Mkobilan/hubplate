"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ChefHat,
  ClipboardList,
  Calendar,
  Package,
  BarChart3,
  QrCode,
  Wifi,
  Smartphone,
  Cpu,
  CheckCircle2,
  Zap,
  ShieldCheck,
  CircleDollarSign,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-slate-950 to-slate-950" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 bg-orange-500/20 rounded-2xl">
                <ChefHat className="h-12 w-12 text-orange-500" />
              </div>
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6">
              <span className="gradient-text">Powerful Restaurant Management.</span>
              <br />
              <span className="text-slate-100">Simple POS.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-10">
              Run your entire restaurant on HubPlate. <span className="text-orange-400">Works offline</span>, AI-integrated, and runs on any device. No expensive hardware or per-seat fees.
            </p>

            {/* Value Badges */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <ValueBadge icon={<Cpu className="h-4 w-4" />} text="AI Optimized" />
              <ValueBadge icon={<Wifi className="h-4 w-4" />} text="Works Offline" />
              <ValueBadge icon={<Smartphone className="h-4 w-4" />} text="BYOD Friendly" />
              <ValueBadge icon={<CircleDollarSign className="h-4 w-4" />} text="No Per-Seat Fees" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary text-lg px-8 py-3">
                Start 14-Day Free Trial
              </Link>
              <Link href="/login" className="btn-secondary text-lg px-8 py-3">
                {t("auth.login")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Narrative Section - Simplicity vs Complexity */}
      <section className="py-20 px-4 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Built for simplicity, not complexity.</h2>
          <p className="text-lg text-slate-400 mb-12">
            Most POS systems are built for corporate boardrooms. HubPlate is built for the floor.
            We don't try to be every single software your restaurant needs—just the one that manages your orders,
            staff, and inventory better than anyone else.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="card border-orange-500/20">
              <h3 className="text-xl font-bold mb-4 text-orange-500">The HubPlate Way</h3>
              <ul className="space-y-3">
                <ComparisonItem text="Setup in minutes, not weeks" />
                <ComparisonItem text="Use your own phones and tablets" />
                <ComparisonItem text="AI menu builder from photos" />
                <ComparisonItem text="One flat monthly price" />
              </ul>
            </div>
            <div className="card opacity-60">
              <h3 className="text-xl font-bold mb-4 text-slate-400">The Legacy Way</h3>
              <ul className="space-y-3 text-slate-500">
                <li className="flex items-start gap-2 line-through">Months of training</li>
                <li className="flex items-start gap-2 line-through">$5,000+ proprietary hardware</li>
                <li className="flex items-start gap-2 line-through">Manual menu data entry</li>
                <li className="flex items-start gap-2 line-through">Hidden fees and per-seat costs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="badge badge-info mb-4">23+ FEATURES INCLUDED</span>
            <h2 className="text-4xl font-bold">Everything You Need. Nothing You Don't.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCategory
              icon={<Zap className="h-10 w-10 text-orange-500" />}
              title="AI-Powered Order Management"
              description="Get more orders, get them faster, and make more per ticket."
              features={[
                "AI-Driven Upsell Suggestions",
                "QR Code Ordering & Payments",
                "Tableside Digital Ordering",
                "Offline Order Syncing"
              ]}
            />
            <FeatureCategory
              icon={<ChefHat className="h-10 w-10 text-orange-500" />}
              title="Intelligent Kitchen & Operations"
              description="Keep the heart of your restaurant running smoothly."
              features={[
                "AI Menu Builder from Photos",
                "Advanced Kitchen Display System",
                "Real-time Inventory Waste Tracking",
                "BYOD Hardware Freedom"
              ]}
            />
            <FeatureCategory
              icon={<Calendar className="h-10 w-10 text-orange-500" />}
              title="Smart Staff & Scheduling"
              description="Manage your team without the headaches."
              features={[
                "AI-Assisted Labor Forecasting",
                "Shift Swaps & Availability",
                "Server Performance Tracking",
                "Internal Staff Messaging"
              ]}
            />
            <FeatureCategory
              icon={<BarChart3 className="h-10 w-10 text-orange-500" />}
              title="Inventory & AI Analytics"
              description="Data that actually helps you make better decisions."
              features={[
                "AI Menu Management & Optimization",
                "Automated Low-Stock Alerts",
                "Real-time Sales & Profit Reports",
                "Peak Time Staffing Suggestions"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-slate-900/50 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">One Price. Everything Included.</h2>

          <div className="max-w-md mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-400 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative card p-10 border-orange-500/50 bg-slate-950">
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2">Pro Plan</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">$49</span>
                  <span className="text-slate-400">/mo</span>
                </div>
              </div>

              <ul className="space-y-4 text-left mb-10">
                <PricingCheckitem text="Unlimited Employees" />
                <PricingCheckitem text="Unlimited Orders" />
                <PricingCheckitem text="All AI Features Included" />
                <PricingCheckitem text="Offline Functionality" />
                <PricingCheckitem text="Cancel Anytime" />
                <PricingCheckitem text="Self-Onboarding in Minutes" />
              </ul>

              <Link href="/signup" className="btn-primary w-full py-4 text-lg">
                Start Your 14-Day Free Trial
              </Link>
              <p className="mt-4 text-sm text-slate-500">No credit card required to start.</p>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-4">
              <h4 className="font-bold text-slate-300 mb-2">Wait Times</h4>
              <p className="text-sm text-slate-500 italic">"Legacy systems took weeks to set up. We were live on HubPlate in 20 minutes."</p>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-slate-300 mb-2">Pricing Comparison</h4>
              <p className="text-sm text-slate-500">Typical POS: $150 - $400 /mo + per-seat hardware fees.</p>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-slate-300 mb-2">Hardware Savings</h4>
              <p className="text-sm text-slate-500">Zero mandatory hardware. Use what you already own (iPads, Android tablets, iPhones).</p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Section / Bottom Authority */}
      <section className="py-20 px-4 border-t border-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6 text-slate-300">The Power of AI-Integrated Restaurant Software</h2>
          <div className="text-slate-500 text-sm space-y-4 text-left">
            <p>
              HubPlate is designed to bridge the gap between traditional restaurant hospitality and modern efficiency.
              By integrating artificial intelligence into the core of your operation, we help you eliminate the guesswork
              of inventory management, menu optimization, and staff scheduling. Our platform is built as a Progressive
              Web App (PWA), meaning it works seamlessly on any browser-enabled device without the need for proprietary,
              locked-down hardware.
            </p>
            <p>
              Whether you are running a high-volume diner, a boutique bistro, or a bustling café, HubPlate ensures that
              your technology scales with you. Our unique offline-first architecture means that even if your internet
              connection drops, your business doesn't stop. Reach peak performance with a system that puts you in control.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 px-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-orange-500" />
            <span className="font-semibold">HubPlate</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} HubPlate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ValueBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 border border-slate-800 rounded-full text-xs font-medium text-slate-300">
      <span className="text-orange-500">{icon}</span>
      {text}
    </div>
  );
}

function ComparisonItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function PricingCheckitem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="p-1 bg-orange-500/20 rounded-full">
        <CheckCircle2 className="h-4 w-4 text-orange-500" />
      </div>
      <span className="text-slate-300">{text}</span>
    </li>
  );
}

function FeatureCategory({
  icon,
  title,
  description,
  features,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="card group hover:border-orange-500/50 transition-all duration-300 p-8">
      <div className="p-4 bg-orange-500/10 rounded-2xl w-fit mb-6 group-hover:bg-orange-500/20 transition-colors">
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 mb-6">{description}</p>
      <ul className="space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
            <ArrowRight className="h-4 w-4 text-orange-500/50" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card group hover:border-orange-500/50 transition-all duration-300">
      <div className="p-2 bg-orange-500/10 rounded-lg w-fit mb-4 group-hover:bg-orange-500/20 transition-colors">
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
