import Link from 'next/link';

export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <img src="/logo.svg" alt="LastMart logo" className="h-10 w-auto" />
    </Link>
  );
}
