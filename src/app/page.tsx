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
              <span className="gradient-text">HubPlate</span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-400 max-w-2xl mx-auto mb-10">
              Restaurant POS & Management that works <span className="text-orange-400">offline</span>.
              Run on any device. No expensive hardware required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="btn-primary text-lg px-8 py-3">
                {t("auth.login")}
              </Link>
              <Link href="/signup" className="btn-secondary text-lg px-8 py-3">
                {t("auth.signUp")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything your restaurant needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<ClipboardList className="h-8 w-8" />}
              title="Easy Ordering"
              description="Tableside orders with AI upsell suggestions. Send directly to kitchen."
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8" />}
              title="Staff Scheduling"
              description="Shifts, availability, swaps. Labor forecasting built-in."
            />
            <FeatureCard
              icon={<Package className="h-8 w-8" />}
              title="Smart Inventory"
              description="AI-powered reorder suggestions. Track waste, reduce costs."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Real-time Analytics"
              description="Sales, server performance, peak times. All in one dashboard."
            />
            <FeatureCard
              icon={<QrCode className="h-8 w-8" />}
              title="QR Ordering"
              description="Customers order from their phones. No app download needed."
            />
            <FeatureCard
              icon={<Wifi className="h-8 w-8" />}
              title="Works Offline"
              description="Internet goes down? Keep running. Syncs when back online."
            />
            <FeatureCard
              icon={<Smartphone className="h-8 w-8" />}
              title="BYOD Friendly"
              description="Use any phone or tablet. No proprietary hardware required."
            />
            <FeatureCard
              icon={<ChefHat className="h-8 w-8" />}
              title="AI Menu Builder"
              description="Snap a photo of your menu. AI transforms it instantly."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-t from-orange-950/30 to-transparent">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to save time and money?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Join restaurants that cut costs with mobile-first, AI-powered management.
            Starting at just $30/month.
          </p>
          <Link href="/signup" className="btn-primary text-lg px-10 py-4">
            Start Free Trial
          </Link>
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
