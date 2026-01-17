"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  ChefHat,
  Calendar,
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
  Map,
  Users,
  Database,
  Layout,
  Clock,
  Sparkles,
  TrendingUp,
  SmartphoneNfc,
  Layers,
  Search,
  ScanLine,
  Package,
  ClipboardList,
  Navigation,
  Mail,
  X,
  Scan,
} from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const { t } = useTranslation();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const openModal = (src: string) => setSelectedImage(src);
  const closeModal = () => setSelectedImage(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-orange-500/30">
      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          onClick={closeModal}
        >
          <div className="relative max-w-7xl w-full max-h-[90vh] flex items-center justify-center animate-in fade-in zoom-in duration-300">
            <button
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
              onClick={closeModal}
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={selectedImage}
              alt="Enlarged view"
              className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 object-contain"
            />
          </div>
        </div>
      )}

      {/* Sticky Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 bg-orange-500 rounded-xl overflow-hidden shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
              <img src="/logo.png" alt="HubPlate" className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl font-black tracking-tighter">HubPlate</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="btn btn-ghost text-sm font-bold uppercase tracking-wider">
              {t("auth.login")}
            </Link>
            <Link href="/signup" className="btn btn-primary px-6 py-2.5 text-sm font-bold uppercase tracking-wider shadow-lg shadow-orange-500/25">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(249,115,22,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_100%,rgba(59,130,246,0.05),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-8 animate-fade-in uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The #1 Restaurant Management Ecosystem</span>
          </div>

          <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight mb-8 leading-[0.9] text-white">
            STOP SETTLING.<br />
            <span className="gradient-text">START DOMINATING.</span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
            Legacy POS systems are anchors. HubPlate is your <span className="text-orange-400 font-bold">engine for growth</span>.
            One unified platform designed to crush efficiency, maximize revenue, and outpace your competition.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
            <Link href="/signup" className="btn btn-primary text-xl px-12 py-5 shadow-2xl shadow-orange-500/40 hover:scale-105 transition-all duration-300 font-black tracking-tight">
              GET STARTED IN 60 SECONDS
            </Link>
            <a href="/hubplate.apk" download className="btn btn-secondary text-xl px-10 py-5 hover:bg-slate-800 transition-all flex items-center gap-3 font-bold">
              <Smartphone className="h-6 w-6" />
              <span>Download Mobile App</span>
            </a>
          </div>

          <div className="pt-12 border-t border-white/5">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-8">Trusted by Modern Hospitality Leaders</p>
            <div className="flex flex-wrap justify-center gap-8 sm:gap-16 group transition-all duration-700">
              <ValueBadge icon={<Cpu className="h-5 w-5" />} text="AI-POWERED" />
              <ValueBadge icon={<Wifi className="h-5 w-5" />} text="CLOUD-NATIVE" />
              <ValueBadge icon={<ShieldCheck className="h-5 w-5" />} text="ENTERPRISE-SECURE" />
              <ValueBadge icon={<TrendingUp className="h-5 w-5" />} text="PROFIT-FOCUSED" />
            </div>
          </div>
        </div>
      </header>

      {/* Section: The Command Center (Operations & Analytics) */}
      <section id="features" className="py-24 px-4 bg-slate-900/40 relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight">THE BRAIN OF YOUR <br /><span className="text-orange-500 italic">OPERATION.</span></h2>
            <p className="text-xl text-slate-400 max-w-2xl font-medium">Real-time intelligence that puts you in total control of every cent and every second.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Global Command Dashboard"
              description="Get a 360-degree view of your empire. Monitor live sales, active check totals, and table turnover speed in real-time. Admin overrides allow managers to comp items, adjust gratuities, and settle complex tickets with one tap from any device."
            />
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8" />}
              title="Hyper-Deep Analytics"
              description="Identify profit killers before they hurt your bottom line. Track exact ticket lifecycle timing—from order entry to kitchen prep to window expo. Compare server performance with automated leaderboards and heatmaps of busiest service windows."
            />
            <FeatureCard
              icon={<Map className="h-8 w-8" />}
              title="Interactive Seat Mapping"
              description="Design your dream layout with a drag-and-drop visual builder. Assign server sections in seconds with unique color coding. Our AI vision even generates working seat maps from a simple photo of your restaurant's physical blueprint."
            />
          </div>
        </div>
      </section>

      {/* Section: Guest Experience (Reservations & Waitlist) */}
      <section id="solutions" className="py-24 px-4 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="absolute -inset-10 bg-orange-500/10 blur-3xl rounded-full" />
              <div
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl cursor-zoom-in group"
                onClick={() => openModal("/Seat_map.PNG")}
              >
                <img src="/Seat_map.PNG" alt="Guest Management" className="w-full h-auto group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-transparent" />
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-10">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                FLAWLESS GUEST <br />
                <span className="text-blue-500">EXPERIENCES.</span>
              </h2>

              <div className="grid gap-8">
                <FeatureItem
                  icon={<Calendar className="h-6 w-6" />}
                  title="Omnichannel Reservations"
                  description="A unified timeline that syncs web, mobile, and in-person bookings. Set custom buffer times by party size to maximize table turns, and get 'Pre-Arrival' alerts automatically reflected on your visual seat map."
                />
                <FeatureItem
                  icon={<Users className="h-6 w-6" />}
                  title="Dynamic Digital Waitlist"
                  description="Capture guest data instantly and quote accurate wait times powered by real-time dining data. Notify guests via automated email (SMS Coming Soon) when their table is ready. Seat them with a single swipe directly to any open table."
                />
                <FeatureItem
                  icon={<Smartphone className="h-6 w-6" />}
                  title="White-Label Online Booking"
                  description="Own your guest relationship. Let customers book directly through your website or social media with zero third-party cover fees. Integrates deeply with your availability rules to prevent overbooking forever."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: The Revenue Engine (POS & Payments) */}
      <section className="py-24 px-4 bg-orange-500/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-orange-500/5 skew-x-12 transform translate-x-1/2" />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl sm:text-7xl font-black mb-6 tracking-tighter uppercase italic">The Ultimate Profit Machine.</h2>
            <p className="text-2xl font-bold text-orange-500 uppercase tracking-widest italic animate-pulse">STOP PAYING TRANSACTION TAX. WE CHARGE ZERO FEES.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="card p-8 bg-slate-900/80 border-white/10">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <SmartphoneNfc className="text-orange-500 h-8 w-8" />
                  NEXT-GEN POS
                </h3>
                <div className="grid gap-6">
                  <p className="text-slate-400 font-medium leading-relaxed">
                    Input orders by <span className="text-white">seat number</span>, add upsells on the fly, and split checks with drag-and-drop ease.
                    Built-in loyalty prompts turn every guest into a regular.
                  </p>
                  <ul className="space-y-4">
                    <FeatureListItem text="Table-side NFC & QR Terminal" />
                    <FeatureListItem text="Seat-Based Splitting" />
                    <FeatureListItem text="Dynamic Happy Hour Pricing" />
                    <FeatureListItem text="BYOD: Use any phone or tablet" />
                  </ul>
                </div>
              </div>

              <div className="card p-8 bg-slate-900/80 border-white/10">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <QrCode className="text-orange-500 h-8 w-8" />
                  PAYMENTS & LOYALTY
                </h3>
                <div className="grid gap-6">
                  <p className="text-slate-400 font-medium leading-relaxed">
                    Connected to Stripe for instant payouts. Sell physical and digital <span className="text-white">Gift Cards</span> with zero commission.
                    Run your own loyalty rules—your data, your rules.
                  </p>
                  <ul className="space-y-4">
                    <FeatureListItem text="Commission-Free Gift Cards" />
                    <FeatureListItem text="Scan & Pay QR Technology" />
                    <FeatureListItem text="Custom Loyalty Points System" />
                    <FeatureListItem text="Zero HubPlate Transaction Fees" />
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="card p-8 bg-slate-900/80 border-white/10 h-full">
                <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Search className="text-orange-500 h-8 w-8" />
                  ONLINE ORDER HUB
                </h3>
                <p className="text-slate-400 font-medium leading-relaxed mb-8">
                  Your beautiful, SEO-optimized public ordering site. Deeply integrated with <span className="text-white">Uber Direct</span> to provide professional delivery logistics without 30% marketplace commissions.
                </p>
                <div
                  className="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl group hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in"
                  onClick={() => openModal("/online_ordering.PNG")}
                >
                  <img src="/online_ordering.PNG" alt="Online Ordering Hub" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: The Kitchen Heart (KDS & AI Menu) */}
      <section className="py-24 px-4 bg-slate-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-10">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                BUILT FOR THE <br />
                <span className="text-orange-500 italic">HEAT OF THE LINE.</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                Custom Kitchen Display Systems that eliminate verbal chaos and track every millisecond from ticket to table.
              </p>

              <div className="grid gap-8">
                <FeatureItem
                  icon={<ChefHat className="h-6 w-6" />}
                  title="Limitless KDS Architecture"
                  description="Deploy specialized screens for Grill, Sauté, Salad, or the high-pressure Expo line. Our cloud-sync technology ensures that when an item is marked 'Ready' on a prep screen, it instantly alerts the runner on the floor."
                />
                <FeatureItem
                  icon={<ScanLine className="h-6 w-6" />}
                  title="Vision-AI Menu Onboarding"
                  description="Transform your legacy paper menus into a digital powerhouse. Our AI vision system scans your physical menu, auto-categorizes items, and builds your entire modifier and add-on database in minutes, not days."
                />
                <FeatureItem
                  icon={<Database className="h-6 w-6" />}
                  title="Precision Culinary Inventory"
                  description="Bridge the gap between the line and the bank. Link complex recipes directly to menu items so that every bun, patty, and gram of sauce is deducted in real-time. Catch theft and wastage at the source with automated yield tracking."
                />
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-orange-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in group"
                onClick={() => openModal("/KDSpreview.PNG")}
              >
                <img src="/KDSpreview.PNG" alt="HubPlate KDS Interface" className="w-full h-auto group-hover:scale-[1.05] transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: AI Features */}
      <section className="py-24 px-4 bg-slate-950 border-b border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="lg:flex items-center gap-20">
            <div className="flex-1 space-y-12 relative order-2 lg:order-1">
              <div
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl cursor-zoom-in group -rotate-2 hover:rotate-0 transition-all duration-700 z-20"
                onClick={() => openModal("/ai-prompt.png")}
              >
                <img src="/ai-prompt.png" alt="AI Prompt Interface" className="w-full h-auto" />
              </div>
              <div
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl cursor-zoom-in group rotate-3 hover:rotate-0 transition-all duration-700 mt-[-10%] lg:mt-[-20%] z-10"
                onClick={() => openModal("/ai-suggestions.png")}
              >
                <img src="/ai-suggestions.png" alt="AI Menu Suggestions" className="w-full h-auto" />
              </div>
              <div className="absolute -inset-20 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <div className="flex-1 space-y-10 order-1 lg:order-2 mb-16 lg:mb-0">
              <h2 className="text-5xl sm:text-7xl font-black tracking-tighter leading-[0.9]">
                AI THAT ACTUALLY <br />
                <span className="text-blue-500">WORKS FOR YOU.</span>
              </h2>

              <div className="grid gap-8">
                <div className="flex gap-6 group">
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl w-fit h-fit text-orange-500 group-hover:scale-110 transition-transform">
                    <Scan className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Scan-to-Menu Technology</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">Snap a photo of your existing menu and watch our AI build your entire digital ordering system in seconds. No more tedious data entry.</p>
                  </div>
                </div>

                <div className="flex gap-6 group">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl w-fit h-fit text-blue-500 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2 uppercase tracking-tight">AI Menu & Trend Generation</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">Stay ahead of the competition. Prompt AI to create new menu items based on current trends, local cuisine, and your actual sales data.</p>
                  </div>
                </div>

                <div className="flex gap-6 group">
                  <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl w-fit h-fit text-orange-500 group-hover:scale-110 transition-transform">
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Smart Inventory Tracking</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">Track every ingredient in real-time. The system automatically alerts you before items run out, helping you stop losing money to waste.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Strategic Logistics (Inventory & Supply Chain) */}
      <section className="py-24 px-4 bg-slate-900/40 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="lg:flex items-center gap-20">
            <div className="order-2 lg:order-1 flex-1 space-y-6">
              <div className="relative group cursor-zoom-in" onClick={() => openModal("/inventory.PNG")}>
                <div className="absolute -inset-4 bg-orange-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                  <img src="/inventory.PNG" alt="Inventory Management" className="w-full h-auto" />
                </div>
              </div>
              <div className="relative group cursor-zoom-in" onClick={() => openModal("/inventory2.PNG")}>
                <div className="absolute -inset-4 bg-blue-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                  <img src="/inventory2.PNG" alt="Inventory Detailed View" className="w-full h-auto" />
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 flex-1 space-y-10">
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
                MASTER YOUR <br />
                <span className="text-orange-500 italic">SUPPLY CHAIN.</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                Don't just track stock. Predict it. HubPlate connects your storage areas to your vendors for frictionless restocking.
              </p>

              <div className="grid gap-8">
                <FeatureItem
                  icon={<Package className="h-6 w-6" />}
                  title="Dynamic Storage Locations"
                  description="Mirror your physical space digitally. Organize inventory by walk-ins, dry storage, bars, and prep stations. Know exactly where your high-value stock is at all times."
                />
                <FeatureItem
                  icon={<ClipboardList className="h-6 w-6" />}
                  title="Automatic Wastage Logs"
                  description="Empower your staff to record spills, breaks, and expirations on the fly. Digital counting sheets work offline and sync instantly, providing real-time impact reports on your COGS."
                />
                <FeatureItem
                  icon={<Users className="h-6 w-6" />}
                  title="Integrated Vendor Hub"
                  description="Manage all your suppliers in one place. HubPlate monitors stock levels against your custom par rules and allows you to generate Purchase Orders based on previous orders and needs."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Human Capital (Staff & Scheduling) */}
      <section className="py-24 px-4 bg-slate-950 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="lg:flex items-center gap-20">
            <div className="flex-1 space-y-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
                <Users className="h-3.5 w-3.5" />
                <span>Smart Labor Management</span>
              </div>
              <h2 className="text-5xl font-black tracking-tighter leading-[0.9]">
                STOP WASTING HOURS <br />
                <span className="text-white">ON THE SCHEDULE.</span>
              </h2>
              <p className="text-xl text-slate-400 font-medium leading-relaxed">
                <span className="text-white">Smartest Scheduling on Earth</span>. Create rules: "Need 2 servers, 2 cooks, and 2 dishwashers during Peak Friday." The system scans employee availability and generates your schedule for you automatically.
              </p>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                    <Clock className="text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1 uppercase tracking-wider">Availability-Based Scheduling</h4>
                    <p className="text-slate-500 text-sm">Input your staffing needs and let the system handle the rest. The system respects employee availability and your restaurant's specific scheduling rules.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                    <Smartphone className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1 uppercase tracking-wider">Staff BYOD App</h4>
                    <p className="text-slate-500 text-sm">Empower your team. Staff can clock in/out, view schedules, and swap shifts directly from their personal smartphones.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center shrink-0">
                    <CircleDollarSign className="text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-1 uppercase tracking-wider">Exportable Labor Data</h4>
                    <p className="text-slate-500 text-sm">Track actual labor costs vs. scheduled. Export verified timesheet data via CSV to upload directly into your accounting or payroll software.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 mt-20 lg:mt-0">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                <div className="relative card p-8 bg-slate-900 border-white/10 shadow-3xl">
                  <div className="flex items-center justify-between mb-8">
                    <h5 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Enterprise Multi-Location</h5>
                    <div className="flex gap-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-75" />
                    </div>
                  </div>
                  <p className="text-slate-300 font-medium mb-6">Scale your vision. When creating a new location, instantly copy your existing menus, recipes, and inventory storage rules to get your new site up and running in minutes.</p>
                  <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Layout className="text-orange-500" />
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Active Locations</p>
                        <p className="text-xl font-black text-white">HubPlate Central</p>
                      </div>
                    </div>
                    <ArrowRight className="text-slate-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Resilience & scale */}
      <section className="py-24 px-4 bg-slate-950 overflow-hidden relative">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl sm:text-7xl font-black mb-16 tracking-tighter">BUILT TO <span className="text-blue-500">SCALE.</span> READY TO <span className="text-orange-500">CRUSH.</span></h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={<Wifi className="h-8 w-8" />} title="OFFLINE MODE" value="100% RELIABILITY" desc="Keep taking orders and printing tickets even when the internet dies. Syncs automatically once you're back." />
            <StatCard icon={<Layers className="h-8 w-8" />} title="MULTI-LOCATIONS" value="UNRESTRICTED" desc="Control 50 locations from one dashboard. Unified reporting and master menu controls." />
            <StatCard icon={<Navigation className="h-8 w-8" />} title="HYPER-SYNC" value="REAL-TIME" desc="Millisecond latency across POS, KDS, and mobile apps. No data lag, ever." />
            <StatCard icon={<Mail className="h-8 w-8" />} title="AUTOMATED MARKETING" value="AI-DRIVEN" desc="Retarget guests based on their order history and frequency. High-conversion loyalty loops." />
          </div>
        </div>
      </section>

      {/* Section: Pricing */}
      <section id="pricing" className="py-24 px-4 bg-slate-950 border-b border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="max-w-7xl mx-auto">
          <div className="lg:flex gap-16 items-start">
            {/* Left Column: Plan Details */}
            <div className="flex-1 space-y-10 mb-16 lg:mb-0">
              <div className="space-y-4">
                <h2 className="text-6xl font-black tracking-tighter text-white">Professional Plan</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-8xl font-black text-white">$99</span>
                  <span className="text-2xl font-bold text-slate-500 uppercase tracking-tighter">/mo per location</span>
                </div>
                <p className="text-lg font-black text-orange-500 tracking-[0.2em] uppercase">Every Single Feature Included</p>
              </div>

              <div className="p-8 bg-slate-900/50 border border-white/5 rounded-3xl relative">
                <div className="absolute -left-2 top-8 w-1 h-12 bg-orange-500 rounded-full" />
                <p className="text-xl font-medium text-slate-300 italic leading-relaxed">
                  "The last POS transition you will ever make. Scale your business without the hardware tax."
                </p>
              </div>

              <div className="space-y-6">
                <Link href="/signup" className="w-full sm:w-auto px-12 py-5 bg-orange-500 text-white font-black text-xl rounded-2xl hover:bg-orange-600 hover:scale-[1.02] transition-all shadow-xl shadow-orange-500/20 uppercase tracking-tight inline-block text-center">
                  Start 14-Day Free Trial
                </Link>
                <p className="text-slate-500 font-bold text-sm tracking-wide">Cancel anytime.</p>
              </div>
            </div>

            {/* Right Column: Features Card */}
            <div className="flex-1">
              <div className="card bg-slate-900/40 border-white/10 p-10 sm:p-12 relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] text-center mb-12">Included Features</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-10">
                  <PricingFeatureItem text="Visual Seating Map" />
                  <PricingFeatureItem text="Server Assignment" />
                  <PricingFeatureItem text="Reservations System" />
                  <PricingFeatureItem text="AI Menu (Photo)" />
                  <PricingFeatureItem text="Seat-Based Orders" />
                  <PricingFeatureItem text="Custom KDS Screens" />
                  <PricingFeatureItem text="BYOD Independence" />
                  <PricingFeatureItem text="Live KDS Tracking" />
                  <PricingFeatureItem text="Loyalty Program" />
                  <PricingFeatureItem text="CRM & SMS/Email" />
                  <PricingFeatureItem text="Rule-Based Scheduling" />
                  <PricingFeatureItem text="Mobile Clock-In" />
                  <PricingFeatureItem text="Terminal Pin Login" />
                  <PricingFeatureItem text="Multi-Location" />
                  <PricingFeatureItem text="Inventory System" />
                  <PricingFeatureItem text="Table Upselling" />
                  <PricingFeatureItem text="AI Menu Generation" />
                  <PricingFeatureItem text="Deep Analytics" />
                  <PricingFeatureItem text="Drag-and-Drop Floor Builder" />
                  <PricingFeatureItem text="Omnichannel Reservation Sync" />
                  <PricingFeatureItem text="Commission-Free Online Ordering" />
                  <PricingFeatureItem text="Uber Direct Delivery Integration" />
                  <PricingFeatureItem text="Digital Gift Card Sales" />
                  <PricingFeatureItem text="Limitless KDS Prep Stations" />
                  <PricingFeatureItem text="Real-Time Expo Integration" />
                  <PricingFeatureItem text="Precision Recipe P&L Analysis" />
                  <PricingFeatureItem text="Automated Vendor PO Generation" />
                  <PricingFeatureItem text="CSV Verified Payroll Exports" />
                  <PricingFeatureItem text="Seamless New Location Setup" />
                  <PricingFeatureItem text="Cloud-Offline Resilience Sync" />
                  <PricingFeatureItem text="Ongoing Support and Training" />
                </div>

                <div className="mt-12 p-6 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                  <p className="text-xs text-slate-500 text-center font-bold uppercase tracking-widest leading-relaxed">
                    Transparent pricing. Zero hidden fees. <br />
                    Built for operators, by operators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Authority/SEO */}
      <section className="py-24 px-4 border-t border-white/5 bg-slate-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Search className="text-slate-700 h-5 w-5" />
            <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.4em]">Leading Hospitality Intelligence</h2>
          </div>
          <div className="prose prose-invert prose-slate max-w-none text-slate-500 text-sm leading-relaxed">
            <p className="mb-6">
              In 2026, the restaurant industry belongs to those who leverage <span className="text-slate-300">Cloud-based POS systems</span> and <span className="text-slate-300">AI-powered analytics</span>.
              HubPlate leads the charge as a comprehensive <span className="text-slate-300">restaurant management platform</span>, integrating <span className="text-slate-300">real-time hospitality intelligence</span> directly into
              your workflow. Our precision-engineered <span className="text-slate-300">Kitchen Display Systems (KDS)</span> and <span className="text-slate-300">POS terminals</span> are built to handle high-volume shifts,
              providing unprecedented insights into <span className="text-slate-300">menu profitability</span>, <span className="text-slate-300">inventory management</span>, and <span className="text-slate-300">table management</span>.
              Whether it&apos;s <span className="text-slate-300">online ordering</span> or in-house dining operations, HubPlate ensures everything runs in perfect harmony while maximizing every <span className="text-slate-300">upselling opportunity</span>.
            </p>
            <p>
              By leveraging <span className="text-slate-300">automated staff scheduling</span> rules and availability tracking, HubPlate reduces administrative overhead by up to 80%, putting you back in
              control of your business. Our <span className="text-slate-300">Mobile POS technology</span> allows for seamless <span className="text-slate-300">contactless payments</span> tableside,
              while our integrated <span className="text-slate-300">customer loyalty programs</span> and AI-driven CRM tools drive consistent repeat revenue. From predictive <span className="text-slate-300">supply chain logistics</span> to commission-free <span className="text-slate-300">online ordering hub</span>, experience the power of a modern ecosystem where every
              data point is a growth opportunity. HubPlate isn&apos;t just software; it&apos;s the future of <span className="text-slate-300">hospitality management</span>.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-orange-500 rounded-lg overflow-hidden shrink-0">
              <img src="/logo.png" alt="HubPlate" className="h-full w-full object-cover" />
            </div>
            <span className="text-xl font-black tracking-tighter">HubPlate</span>
          </div>

          <div className="flex gap-10 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href="#" className="hover:text-white transition-colors">Support</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>

          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            © {new Date().getFullYear()} HubPlate. Precision Built for Modern Restaurants.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ValueBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-900 border border-white/10 rounded-full text-[10px] font-black tracking-widest text-white uppercase hover:border-orange-500/50 transition-colors">
      <span className="text-orange-500">{icon}</span>
      {text}
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="p-3 bg-slate-900 border border-white/5 rounded-2xl w-fit h-fit text-orange-500 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-black mb-1 group-hover:text-orange-400 transition-colors uppercase tracking-tight">{title}</h3>
        <p className="text-slate-500 leading-relaxed text-sm font-medium">{description}</p>
      </div>
    </div>
  );
}

function FeatureListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
      <span className="text-slate-300 font-bold text-sm tracking-tight">{text}</span>
    </li>
  );
}

function PricingFeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
      <span className="text-slate-300 font-bold text-sm">{text}</span>
    </li>
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
    <div className="card p-10 group hover:border-orange-500/50 transition-all duration-500 bg-slate-900/40 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="p-4 bg-orange-500/10 rounded-2xl w-fit mb-8 group-hover:scale-110 transition-transform duration-500 border border-orange-500/20">
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">{title}</h3>
      <p className="text-slate-500 font-medium leading-relaxed">{description}</p>
    </div>
  );
}

function InventoryLogItem({ item, status, value }: { item: string; status: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-2 w-2 rounded-full bg-orange-500" />
        <div>
          <p className="text-sm font-bold text-white">{item}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">{status}</p>
        </div>
      </div>
      <p className="text-sm font-black text-slate-300">{value}</p>
    </div>
  );
}

function StatCard({ icon, title, value, desc }: { icon: React.ReactNode; title: string, value: string, desc: string }) {
  return (
    <div className="p-8 bg-slate-900/50 border border-white/5 rounded-3xl hover:border-blue-500/30 transition-all group">
      <div className="text-blue-500 mb-6 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{title}</h4>
      <p className="text-2xl font-black text-white mb-4">{value}</p>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

