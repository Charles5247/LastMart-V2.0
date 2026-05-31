import type { Metadata } from 'next';
import RegisterClient from '@/components/auth/RegisterClient';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join LastMart to shop from local vendors or start selling your products. Free registration for buyers and sellers across Nigeria.',
  alternates: { canonical: 'https://lastmart.com/auth/register' },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
