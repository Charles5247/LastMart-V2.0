import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/AppContext";
import { Toaster } from "react-hot-toast";
import WhatsAppButton from "@/components/ui/WhatsAppButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "LastMart — Nigeria's #1 Local Marketplace",
    template: "%s | LastMart",
  },
  description:
    "Nigeria's fastest local marketplace. Shop from verified vendors in your city and get delivery within 48 hours. Buyer protection on every order.",
  keywords:
    "marketplace, local shopping, Nigeria, Lagos, vendors, ecommerce, buy online Nigeria",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://lastmart.com",
  ),
  openGraph: {
    siteName: "LastMart",
    type: "website",
    locale: "en_NG",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-gray-50`}
        suppressHydrationWarning
      >
        <AppProvider>
          {children}
          {/* Global floating WhatsApp support CTA */}
          <WhatsAppButton />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3006,
              style: {
                borderRadius: "12px",
                fontFamily: "inherit",
                fontSize: "14px",
              },
              success: { iconTheme: { primary: "#f97316", secondary: "#fff" } },
            }}
          />
        </AppProvider>
      </body>
    </html>
  );
}
