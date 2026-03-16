import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/AppContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LastMart - Local Marketplace | Shop from Nearby Vendors',
  description: 'Nigeria\'s fastest local marketplace. Shop from vendors in your city and get delivery within 48 hours.',
  keywords: 'marketplace, local shopping, Nigeria, Lagos, vendors, ecommerce',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`} suppressHydrationWarning>
        <AppProvider>
          {children}
          <Toaster position="top-right" toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px' },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
          }} />
        </AppProvider>
      </body>
    </html>
  );
}
