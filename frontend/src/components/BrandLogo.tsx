import { cn } from '@/lib/utils';

/** Served from `public/gr-logo.png` */
export const BRAND_LOGO_SRC = '/gr-logo.png';

type BrandLogoProps = {
  className?: string;
  alt?: string;
};

export function BrandLogo({ className, alt = 'Garima Realty' }: BrandLogoProps) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={alt}
      className={cn('h-8 w-8 shrink-0 object-contain', className)}
      loading="lazy"
      decoding="async"
    />
  );
}
