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
  title: "HubPlate - Restaurant POS & Management",
  description:
    "Mobile-first restaurant ordering, scheduling, and management. Works offline.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HubPlate",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
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
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
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
