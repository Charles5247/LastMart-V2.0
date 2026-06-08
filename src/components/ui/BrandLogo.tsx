import Link from 'next/link';

export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <img src="/Logo-1.png" alt="LastMart logo" className="h-10 w-auto" />
    </Link>
  );
}
