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
  Map,
  Users,
  Database,
  Layout,
  MessageSquare,
  Clock,
  Navigation,
  Sparkles,
  TrendingUp,
  Mail,
  SmartphoneNfc,
  Layers,
  Search,
  ScanLine,
} from "lucide-react";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Hero Section */}
      <header className="relative overflow-hidden border-b border-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="relative max-w-7xl mx-auto px-4 py-12 sm:py-20">
          <div className="text-center">
            {/* Centered Logo - 2.5x Bigger */}
            <div className="flex justify-center mb-12">
              <div className="relative group">
                <div className="absolute -inset-4 bg-orange-500/20 rounded-3xl blur-xl group-hover:bg-orange-500/30 transition-all duration-700" />
                <img src="/logo.png" alt="HubPlate Logo" className="relative h-48 w-48 object-contain" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium mb-8 animate-fade-in uppercase tracking-widest">
              <Sparkles className="h-4 w-4" />
              <span>Next-Gen Restaurant Intelligence</span>
            </div>

            <h1 className="text-6xl sm:text-8xl font-black tracking-tight mb-8 leading-tight">
              <span className="gradient-text block">THE ONLY RESTAURANT APP</span>
              <span className="text-white">YOU'LL EVER NEED.</span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-400 max-w-4xl mx-auto mb-12 leading-relaxed">
              HubPlate isn't just a POS—it's your restaurant's <span className="text-orange-400 font-bold italic">Unfair Advantage</span>.
              One app to manage your entire operation, from AI menu generation to smart staff scheduling.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Link href="/signup" className="btn btn-primary text-xl px-12 py-4 shadow-[0_0_30px_-5px_rgba(249,115,22,0.5)] hover:scale-105 transition-transform duration-300">
                Start 14-Day Free Trial
              </Link>
              <Link href="/login" className="btn btn-secondary text-xl px-12 py-4 hover:bg-slate-800 transition-colors">
                {t("auth.login")}
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-6 opacity-80">
              <ValueBadge icon={<Cpu className="h-5 w-5" />} text="AI Menu Intelligence" />
              <ValueBadge icon={<Wifi className="h-5 w-5" />} text="True Offline Mode" />
              <ValueBadge icon={<Smartphone className="h-5 w-5" />} text="BYOD Freedom" />
              <ValueBadge icon={<ShieldCheck className="h-5 w-5" />} text="Secure Operations" />
            </div>
          </div>
        </div>
      </header>

      {/* Feature Showcase: Seating & Orders */}
      <section className="py-24 px-4 bg-slate-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                Master the Floor with <br />
                <span className="text-orange-500">Visual Precision.</span>
              </h2>
              <div className="space-y-6">
                <FeatureItem
                  icon={<Map className="h-6 w-6" />}
                  title="Dynamic Seating Maps"
                  description="Design your exact floor plan in minutes. Assign servers with a drag and drop. See exactly who's sat, who's paying, and who's camping."
                />
                <FeatureItem
                  icon={<Users className="h-6 w-6" />}
                  title="Seat-Based Ordering"
                  description="Forget 'Person 1'. Put in orders by seat number just like the pros. Makes splitting checks at the end of the night a 5-second task."
                />
                <FeatureItem
                  icon={<Calendar className="h-6 w-6" />}
                  title="Integrated Reservations"
                  description="Seamlessly sync reservations with your floor map. Know exactly where your guests are going before they even walk through the door."
                />
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-4 bg-orange-500/20 rounded-3xl blur-2xl group-hover:bg-orange-500/30 transition-all duration-500" />
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                <img src="/seat-map-preview.png" alt="Seating Map Preview" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase: AI & Inventory */}
      <section className="py-24 px-4 border-y border-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative h-[500px]">
              {/* Swapped Images for AI Section as per request */}
              <div className="absolute top-0 right-0 w-4/5 z-0 opacity-60 transform translate-x-4 -translate-y-4 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group hover:opacity-100 transition-opacity duration-500">
                <img src="/ai-prompt.png" alt="AI Prompt" className="w-full h-auto" />
              </div>
              <div className="absolute bottom-0 left-0 w-4/5 z-10 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl shadow-orange-500/20 transform -translate-x-4 translate-y-4 hover:scale-105 transition-transform duration-500">
                <img src="/ai-suggestions.png" alt="AI Suggestions" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                AI That Actually <br />
                <span className="text-blue-500">Works For You.</span>
              </h2>
              <div className="space-y-6">
                <FeatureItem
                  icon={<ScanLine className="h-6 w-6" />}
                  title="Scan-to-Menu Technology"
                  description="Snap a photo of your existing menu and watch our AI build your entire digital ordering system in seconds. No more tedious data entry."
                />
                <FeatureItem
                  icon={<Sparkles className="h-6 w-6" />}
                  title="AI Menu & Trend Generation"
                  description="Stay ahead of the competition. Prompt AI to create new menu items based on current trends, local cuisine, and your actual sales data."
                />
                <FeatureItem
                  icon={<Database className="h-6 w-6" />}
                  title="Smart Inventory Tracking"
                  description="Track every ingredient in real-time. The system automatically alerts you before items run out, helping you stop losing money to waste."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase: KDS & Kitchen */}
      <section className="py-24 px-4 bg-slate-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-6">Built for the Heat.</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Custom Kitchen Display Systems that keep your back-of-house running like a Swiss watch.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Layout className="h-8 w-8" />}
              title="Create Your Own KDS"
              description="Custom KDS screens for every station. Hot Line, Cold Line, Bar, Expo—you name it, you can build it."
            />
            <FeatureCard
              icon={<Navigation className="h-8 w-8" />}
              title="Smart Routing"
              description="Easily map menu items to specific screens. Salads go to Garden, Steaks go to Grill. Zero confusion."
            />
            <FeatureCard
              icon={<Layers className="h-8 w-8" />}
              title="Real-Time Tracking"
              description="Track order progress from prep to plate. See exactly how long tickets have been hanging and eliminate bottlenecks."
            />
          </div>
        </div>
      </section>

      {/* Feature Showcase: Staff & CRM */}
      <section className="py-24 px-4 border-y border-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-orange-600/5 -skew-x-12 transform translate-x-1/2" />
        <div className="max-w-7xl mx-auto relative lg:flex items-center gap-16">
          <div className="flex-1 space-y-10">
            <div className="space-y-4">
              <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none">The Ultimate Profit Machine.</h2>
              <p className="text-2xl font-bold text-orange-500 uppercase tracking-widest italic animate-pulse">STOP PAYING FOR POS THAT OWNS YOUR DATA.</p>
            </div>

            <div className="space-y-8">
              <div className="group">
                <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                  <Clock className="text-orange-500" />
                  Smartest Scheduling on Earth
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Create rules: "Need 2 servers, 2 cooks, and 2 dishwashers during Peak Friday."
                  The system scans employee availability and <span className="text-white font-bold">generates your schedule for you</span> automatically.
                </p>
              </div>
              <div className="group">
                <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                  <Mail className="text-orange-500" />
                  Your CRM, Not Theirs
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Own your customers. Run your own loyalty program and blast promotions via text or email.
                  Drive repeat business without paying third-party fees.
                </p>
              </div>
              <div className="group">
                <h3 className="text-2xl font-bold mb-3 flex items-center gap-3">
                  <SmartphoneNfc className="text-orange-500" />
                  BYOD & Mobile Clock-in
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Run on any device. Employees can <span className="text-white font-bold">clock in through their phone</span> app.
                  Secure terminal login with pincode for fast access on the floor.
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 mt-16 lg:mt-0">
            <div className="card border-orange-500/20 p-10 bg-slate-900/50 backdrop-blur-xl">
              <h4 className="text-2xl font-bold mb-8 text-center uppercase tracking-widest text-orange-500">Everything You Get</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8 text-sm">
                <ul className="space-y-3">
                  <FeatureListItem text="Visual Seating Map" />
                  <FeatureListItem text="Server Assignment" />
                  <FeatureListItem text="Reservations System" />
                  <FeatureListItem text="AI Menu (Photo)" />
                  <FeatureListItem text="Seat-Based Orders" />
                  <FeatureListItem text="Custom KDS Screens" />
                </ul>
                <ul className="space-y-3">
                  <FeatureListItem text="BYOD Independence" />
                  <FeatureListItem text="Live KDS Tracking" />
                  <FeatureListItem text="Loyalty Program" />
                  <FeatureListItem text="CRM & SMS/Email" />
                  <FeatureListItem text="Rule-Based Scheduling" />
                  <FeatureListItem text="Mobile Clock-In" />
                </ul>
                <ul className="space-y-3">
                  <FeatureListItem text="Terminal Pin Login" />
                  <FeatureListItem text="Multi-Location" />
                  <FeatureListItem text="Inventory System" />
                  <FeatureListItem text="Table Upselling" />
                  <FeatureListItem text="AI Menu Generation" />
                  <FeatureListItem text="Deep Analytics" />
                </ul>
              </div>
              <div className="mt-10 p-6 bg-orange-500/10 rounded-2xl border border-orange-500/30">
                <p className="text-white font-bold text-center italic tracking-wide">Built by hospitality veterans to solve real problems, not just sell hardware.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl sm:text-6xl font-black mb-12">Total Freedom. One Flat Price.</h2>
          <div className="relative group max-w-4xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative card p-10 sm:p-16 bg-slate-950 border-white/5 shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="text-left space-y-8">
                  <div>
                    <h3 className="text-4xl font-black mb-4">Professional Plan</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-8xl font-black text-white">$49</span>
                      <span className="text-2xl text-slate-500 font-medium">/mo per location</span>
                    </div>
                    <p className="mt-6 text-orange-400 font-bold uppercase tracking-widest text-lg">Every Single Feature Included</p>
                  </div>

                  <div className="p-8 bg-orange-500/5 rounded-3xl border border-orange-500/10">
                    <p className="text-slate-300 text-lg leading-relaxed italic">"The last POS transition you will ever make. Scale your business without the hardware tax."</p>
                  </div>

                  <Link href="/signup" className="btn btn-primary w-full py-6 text-2xl font-bold shadow-xl block text-center">
                    START 14-DAY FREE TRIAL
                  </Link>
                  <p className="text-center text-slate-500 font-medium tracking-wide">No credit card required. Cancel anytime.</p>
                </div>

                <div className="bg-slate-900/50 rounded-3xl p-8 border border-white/5">
                  <h4 className="text-xl font-bold mb-8 uppercase tracking-widest text-slate-400 text-center">Included Features</h4>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Section / Bottom Authority */}
      <section className="py-24 px-4 bg-slate-900/10 border-t border-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Search className="h-6 w-6 text-slate-600" />
            <h2 className="text-xl font-bold text-slate-500 uppercase tracking-widest">Industry Leading Restaurant Technology</h2>
          </div>
          <div className="prose prose-invert max-w-none text-slate-500 text-base leading-relaxed text-center">
            <p className="mb-6">
              In 2025, successful restaurateurs are choosing <span className="text-slate-400 text-lg">Cloud-based POS systems</span> over legacy, hard-wired alternatives.
              HubPlate leads the charge by integrating <span className="text-slate-400 text-lg">AI-powered analytics</span> directly into your workflow,
              providing unprecedented insights into <span className="text-slate-400 text-lg">Inventory management</span> and menu profitability.
              Our state-of-the-art <span className="text-slate-400 text-lg">Kitchen Display Systems (KDS)</span> and <span className="text-slate-400 text-lg">Table management</span> solutions
              are built to handle the highest volumes, ensuring your <span className="text-slate-400 text-lg">Online ordering</span> and in-house dining operations
              run in perfect harmony.
            </p>
            <p>
              By leveraging <span className="text-slate-400 text-lg">Employee scheduling</span> rules and automated availability tracking, HubPlate reduces
              administrative overhead by up to 80%. Our <span className="text-slate-400 text-lg">Mobile POS</span> technology allows for
              <span className="text-slate-400 text-lg"> Contactless payments </span> tableside, while our integrated <span className="text-slate-400 text-lg"> Customer loyalty programs </span>
              drive consistent repeat revenue. Experience the power of a modern restaurant management platform that puts you back in control of your business.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-4 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="p-1 px-2 border border-orange-500/20 rounded">
              <img src="/logo.png" alt="HubPlate" className="h-8 shadow-lg" />
            </div>
            <span className="text-2xl font-black tracking-tighter">HubPlate</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500 font-medium">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Support</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
          <p className="text-sm text-slate-600 font-medium">
            © {new Date().getFullYear()} HubPlate. Precision Engineered for Hospitality.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ValueBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-900/50 border border-slate-800 rounded-full text-sm font-semibold text-slate-300 hover:border-orange-500/30 transition-colors">
      <span className="text-orange-500">{icon}</span>
      {text}
    </div>
  );
}

function FeatureItem({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="p-3 bg-orange-500/10 rounded-2xl w-fit h-fit text-orange-500 group-hover:bg-orange-500/20 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-orange-400 transition-colors">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm sm:text-base">{description}</p>
      </div>
    </div>
  );
}

function FeatureListItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
      <span className="text-slate-300">{text}</span>
    </li>
  );
}

function PricingFeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0" />
      <span className="text-slate-300 font-medium">{text}</span>
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
    <div className="card p-8 group hover:border-orange-500/50 transition-all duration-500 bg-slate-900/30 backdrop-blur-sm">
      <div className="p-4 bg-orange-500/10 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform duration-500">
        <div className="text-orange-500">{icon}</div>
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
