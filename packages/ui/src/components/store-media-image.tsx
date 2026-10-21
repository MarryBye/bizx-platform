import * as React from 'react';
import { cn } from '../lib/utils';
import { StorePlaceholder, BannerPlaceholder } from './placeholders';

export interface StoreMediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  type: 'logo' | 'banner';
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
  resolveUrl?: (url: string | null | undefined) => string | null;
}

export function StoreMediaImage({
  type,
  src,
  alt = '',
  className,
  fallbackClassName,
  resolveUrl,
  onError,
  ...props
}: StoreMediaImageProps): React.JSX.Element {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  const effectiveSrc = resolveUrl ? resolveUrl(src) : src;

  if (!effectiveSrc || hasError) {
    if (type === 'banner') {
      return (
        <BannerPlaceholder
          className={cn('w-full h-full object-cover', fallbackClassName || className)}
        />
      );
    }
    return (
      <StorePlaceholder
        className={cn('w-full h-full object-cover', fallbackClassName || className)}
      />
    );
  }

  return (
    <img
      src={effectiveSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
      {...props}
    />
  );
}
