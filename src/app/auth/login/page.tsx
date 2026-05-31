import type { Metadata } from 'next';
import LoginClient from '@/components/auth/LoginClient';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your LastMart account to shop from local vendors, track orders, and manage your cart.',
  alternates: { canonical: 'https://lastmart.com/auth/login' },
};

export default function LoginPage() {
  return <LoginClient />;
}
