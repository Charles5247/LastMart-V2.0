import Link from 'next/link';

type LogoVariant = 'colored' | 'outline' | 'white';

interface BrandLogoProps {
  className?: string;
  variant?: LogoVariant;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function BrandLogo({ 
  className = '', 
  variant = 'outline',
  size = 'md',
  showText = false 
}: BrandLogoProps) {
  const logoSrc = variant === 'colored' 
    ? '/backless-colored-logo.png' 
    : variant === 'white'
    ? '/lastmart-wht.png'
    : '/backless-logo.png';

  // Size classes — increased to ensure high visibility
  const sizeClasses = {
    sm: 'h-10 sm:h-12',
    md: 'h-14 sm:h-16 md:h-18',
    lg: 'h-18 sm:h-20 md:h-24',
    xl: 'h-24 sm:h-28 md:h-32',
  };

  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`}>
      <img 
        src={logoSrc} 
        alt="LastMart — Nigeria's Local Marketplace" 
        className={`${sizeClasses[size]} w-auto object-contain drop-shadow-sm`}
        style={{ maxWidth: '200px' }}
      />
      {showText && (
        <div className="hidden lg:block">
          <div className="text-white font-black text-xl leading-tight tracking-tight">LastMart</div>
          <div className="text-orange-200 text-xs font-medium">Nigeria's Local Marketplace</div>
        </div>
      )}
    </Link>
  );
}
