"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-orange-500/30 font-sans antialiased">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="h-10 w-10 bg-orange-500 rounded-xl overflow-hidden shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300">
                            <img src="/logo.png" alt="HubPlate" className="h-full w-full object-cover" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter">HubPlate</span>
                    </Link>
                    <Link href="/" className="btn btn-ghost flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </nav>

            {/* Header */}
            <header className="relative pt-32 pb-20 overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(59,130,246,0.15),transparent_70%)]" />
                <div className="relative max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-8 uppercase tracking-[0.2em]">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Service Agreement</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 text-white uppercase italic">
                        Terms <span className="text-blue-500">Service</span>
                    </h1>
                    <p className="text-xl text-slate-400 font-medium">
                        Last Updated: January 17, 2026. Please read carefully.
                    </p>
                </div>
            </header>

            {/* Content */}
            <main className="relative py-20 px-4">
                <div className="max-w-4xl mx-auto space-y-16">
                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">1. Agreement to Terms</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            By accessing or using HubPlate (the "SaaS Platform"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. These terms apply to all visitors, users, and others who access or use the Service.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">2. Subscription & Fees</h2>
                        <div className="space-y-4 text-slate-400 leading-relaxed font-medium">
                            <p>The "Professional Plan" is billed at <span className="text-white font-bold">$99/month per location</span>. Pricing features include:</p>
                            <ul className="list-disc pl-6 space-y-3">
                                <li><span className="text-white font-bold">Free Trial:</span> A 14-day free trial is available for new users. After the trial period, you will be automatically billed.</li>
                                <li><span className="text-white font-bold">Billing Cycle:</span> Fees are billed in advance on a monthly basis and are non-refundable.</li>
                                <li><span className="text-white font-bold">No Transaction Fees:</span> HubPlate does not charge transaction taxes or commissions on your restaurant sales. External payment processor (Stripe) fees still apply.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">3. Use of the Service</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            You are responsible for all activity that occurs under your account. You agree not to:
                        </p>
                        <ul className="list-disc pl-6 space-y-3 text-slate-400 font-medium">
                            <li>Use the service for any illegal or unauthorized purpose.</li>
                            <li>Attempt to gain unauthorized access to our systems or other user accounts.</li>
                            <li>Reverse engineer or attempt to extract source code from our POS and KDS systems.</li>
                            <li>Upload malicious code, viruses, or any items that may disrupt service.</li>
                        </ul>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">4. Intellectual Property</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            HubPlate, including its original content, features, and functionality (excluding user-provided data), is and will remain the exclusive property of HubPlate. Your restaurant data, menus, and employee records remain your property. By using our service, you grant us a license to process this data solely for the purpose of provide the SaaS features.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">5. System Availability & "Offline Mode"</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            While we aim for 99.9% uptime, we provide an "Offline Mode" for our POS and KDS systems to ensure operational continuity during internet outages. You acknowledge that certain cloud-only features (e.g., real-time global sync, online reservation intake) may be unavailable during such periods.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">6. AI Features & Accuracy</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            HubPlate includes AI-powered features such as "Vision-AI Menu Onboarding" and "AI Menu Suggestions." While we strive for precision, we do not guarantee 100% accuracy of AI-generated content. You are responsible for verifying all AI-generated pricing, recipes, and menu items before implementation in your restaurant.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">7. Limitation of Liability</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            In no event shall HubPlate be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">8. Termination</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-blue-500 pl-6">9. Changes to Terms</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice before any new terms taking effect.
                        </p>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-12 px-4 border-t border-white/5 bg-slate-900/50">
                <div className="max-w-7xl mx-auto text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        © 2026 HubPlate. Precision Built for Modern Restaurants.
                    </p>
                </div>
            </footer>
        </div>
    );
}
