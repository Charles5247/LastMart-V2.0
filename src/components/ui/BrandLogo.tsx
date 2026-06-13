import Link from 'next/link';

type LogoVariant = 'colored' | 'outline';

export default function BrandLogo({ className = '', variant = 'outline' }: { className?: string; variant?: LogoVariant }) {
  const logoSrc = variant === 'colored' ? '/backless-colored-logo.png' : '/backless-logo.png';

  return (
    <Link href="/" className={`inline-flex items-center ${className}`}>
      <img src={logoSrc} alt="LastMart logo" className="h-12 sm:h-14 md:h-16 w-auto" />
    </Link>
  );
}
