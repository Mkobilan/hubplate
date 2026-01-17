import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider, QueryProvider } from "@/components/providers";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://hubplate.app"),
  alternates: {
    canonical: "/",
  },
  title: "HubPlate | Leading AI Restaurant POS & Management Software 2026",
  description:
    "HubPlate is the #1 AI-powered restaurant management platform for 2026. Featuring advanced Cloud-based POS, smart KDS, automated inventory logs, staff scheduling, and commission-free online ordering with Uber Direct integration. Scale your restaurant efficiency by 80% with HubPlate's next-gen hospitality intelligence.",
  keywords: [
    "AI restaurant POS system 2026",
    "cloud-based restaurant management software",
    "online restaurant reservations",
    "digital gift cards for restaurants",
    "restaurant recipe management",
    "QR code ordering for restaurants",
    "smart restaurant inventory logs",
    "AI staff scheduling software",
    "next-gen kitchen display system",
    "KDS",
    "restaurant CRM and loyalty programs",
    "best restaurant management app 2026",
    "offline mode POS system",
    "hubplate.app",
    "restaurant cost control intelligence",
    "mobile POS for hospitality",
    "contactless payments tableside",
    "commission-free online ordering",
    "Uber Direct delivery integration",
    "restaurant analytics dashboard",
  ],
  authors: [{ name: "HubPlate Team" }],
  creator: "HubPlate",
  publisher: "HubPlate",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "HubPlate | Leading AI Restaurant POS & Management Software 2026",
    description: "Scale your restaurant with AI-powered POS, online reservations, digital gift cards, and smart inventory logs. The only platform you'll ever need.",
    url: "https://hubplate.app",
    siteName: "HubPlate",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "HubPlate Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HubPlate | Leading AI Restaurant POS & Management Software 2026",
    description: "AI-powered restaurant POS with online reservations, digital gift cards, and smart inventory logs. Built for the modern hospitality industry.",
    images: ["/logo.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HubPlate",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-50 min-h-screen`}>
        <I18nProvider>
          <QueryProvider>
            {children}
            <OfflineIndicator />
            <Toaster position="bottom-right" toastOptions={{
              className: 'bg-slate-900 text-slate-50 border border-slate-800',
              duration: 4000,
            }} />
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
