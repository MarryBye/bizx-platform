import React, { useState, useEffect } from 'react';
import { Image, type ImageResizeMode } from 'react-native';
import { resolveMobileMediaUrl } from '../lib/media';

interface SafeImageProps {
  sourceUrl?: string | null;
  fallback: React.ReactNode;
  className?: string;
  resizeMode?: ImageResizeMode;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  sourceUrl,
  fallback,
  className = 'w-full h-full',
  resizeMode = 'cover'
}) => {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = resolveMobileMediaUrl(sourceUrl);

  useEffect(() => {
    setHasError(false);
  }, [sourceUrl]);

  if (!resolvedUrl || hasError) {
    return <>{fallback}</>;
  }

  return (
    <Image
      source={{ uri: resolvedUrl }}
      className={className}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
  );
};
