"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicy() {
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
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(249,115,22,0.15),transparent_70%)]" />
                <div className="relative max-w-4xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-8 uppercase tracking-[0.2em]">
                        <Shield className="h-3.5 w-3.5" />
                        <span>Legal Documentation</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 text-white uppercase italic">
                        Privacy <span className="text-orange-500">Policy</span>
                    </h1>
                    <p className="text-xl text-slate-400 font-medium">
                        Last Updated: January 17, 2026. Your trust is our greatest asset.
                    </p>
                </div>
            </header>

            {/* Content */}
            <main className="relative py-20 px-4">
                <div className="max-w-4xl mx-auto space-y-16">
                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">1. Introduction</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            HubPlate ("we," "us," or "our") operates the restaurant management platform at hubplate.app. This Privacy Policy describes how we collect, use, and disclose your personal information when you use our services. By using HubPlate, you agree to the collection and use of information in accordance with this policy.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">2. Information Collection</h2>
                        <div className="space-y-4 text-slate-400 leading-relaxed font-medium">
                            <p>We collect several different types of information for various purposes to provide and improve our service to you:</p>
                            <ul className="list-disc pl-6 space-y-3">
                                <li><span className="text-white font-bold">Business Data:</span> Restaurant name, location, menu items, pricing, and operational settings.</li>
                                <li><span className="text-white font-bold">Staff Information:</span> Names, contact details, roles, and availability for scheduling.</li>
                                <li><span className="text-white font-bold">Guest Data:</span> Reservation details, loyalty program membership, and order history (collected on behalf of the restaurant).</li>
                                <li><span className="text-white font-bold">Visual Data:</span> Menu photos and restaurant layouts processed by our Vision-AI systems.</li>
                                <li><span className="text-white font-bold">Technical Data:</span> IP addresses, browser types, and device information for security and analytics.</li>
                            </ul>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">3. Use of Data</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            We use the collected data for various purposes:
                        </p>
                        <ul className="list-disc pl-6 space-y-3 text-slate-400 font-medium">
                            <li>To provide and maintain the SaaS platform.</li>
                            <li>To process transactions via our payment partners (Stripe).</li>
                            <li>To manage reservations and waitlists.</li>
                            <li>To automate staff scheduling and inventory tracking.</li>
                            <li>To provide customer support and notify you of system updates.</li>
                            <li>To improve our AI-driven features (AI menu generation, trending items).</li>
                        </ul>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">4. Third-Party Service Providers</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            We employ third-party companies and individuals to facilitate our service:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl">
                                <h4 className="text-white font-black mb-2 uppercase tracking-wide">Payments</h4>
                                <p className="text-sm text-slate-500 font-medium">We use Stripe for payment processing. They adhere to PCI-DSS standards managed by the PCI Security Standards Council.</p>
                            </div>
                            <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl">
                                <h4 className="text-white font-black mb-2 uppercase tracking-wide">Logistics</h4>
                                <p className="text-sm text-slate-500 font-medium">Uber Direct integration handles delivery fulfillment for online orders when enabled by the restaurant.</p>
                            </div>
                            <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl">
                                <h4 className="text-white font-black mb-2 uppercase tracking-wide">Communications</h4>
                                <p className="text-sm text-slate-500 font-medium">Resend handles transactional emails including reservation confirmations and system alerts.</p>
                            </div>
                            <div className="p-6 bg-slate-900/50 border border-white/5 rounded-2xl">
                                <h4 className="text-white font-black mb-2 uppercase tracking-wide">Hosting</h4>
                                <p className="text-sm text-slate-500 font-medium">Our infrastructure is hosted on industry-leading cloud providers with 99.9% uptime guarantees.</p>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">5. Data Security</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            The security of your data is important to us, but remember that no method of transmission over the Internet is 100% secure. We strive to use commercially acceptable means to protect your Personal Data, including encryption at rest and in transit, and regular security audits of our codebase and infrastructure.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">6. Your Data Rights</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            Depending on your location, you may have certain rights under data protection laws (including GDPR and various US State Laws like CCPA), such as the right to access, update, or delete the information we have on you. Please contact us to exercise these rights.
                        </p>
                    </section>

                    <section className="space-y-6">
                        <h2 className="text-3xl font-black tracking-tight text-white uppercase italic border-l-4 border-orange-500 pl-6">7. Contact Us</h2>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            If you have any questions about this Privacy Policy, please contact us at <span className="text-white font-bold">matthew.kobilan@gmail.com</span>.
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
