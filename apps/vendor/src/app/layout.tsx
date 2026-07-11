import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "LastMart Vendor — Manage Your Store",
    template: "%s | LastMart Vendor",
  },
  description:
    "Manage your LastMart vendor store. Track orders, manage inventory, view analytics, and grow your business.",
  robots: { index: false, follow: false }, // Vendor portal — not for public indexing
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
        {children}
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
      </body>
    </html>
  );
}
