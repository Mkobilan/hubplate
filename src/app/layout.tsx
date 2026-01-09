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
  title: "HubPlate | Best Restaurant POS & AI Management Software 2025",
  description:
    "The most powerful AI-powered restaurant POS system for 2025. HubPlate offers mobile-first ordering, AI menu generation, smart scheduling, and CRM with true offline mode. HubPlate.app is the only restaurant management app you'll ever need.",
  keywords: [
    "restaurant POS software",
    "cloud-based POS",
    "AI restaurant management",
    "mobile POS for restaurants",
    "kitchen display system",
    "KDS",
    "restaurant inventory software",
    "staff scheduling app",
    "offline POS system",
    "restaurant CRM",
    "hubplate.app",
    "best restaurant POS 2025",
  ],
  authors: [{ name: "HubPlate Team" }],
  creator: "HubPlate",
  publisher: "HubPlate",
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "HubPlate | Best Restaurant POS & AI Management Software 2025",
    description: "AI-powered restaurant POS with offline mode and smart scheduling. Built for the modern hospitality industry.",
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
    title: "HubPlate | Best Restaurant POS & AI Management Software 2025",
    description: "AI-powered restaurant POS with offline mode and smart scheduling.",
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
