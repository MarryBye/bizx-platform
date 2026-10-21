import React from 'react';
import { StoreMediaImage as BaseStoreMediaImage, type StoreMediaImageProps } from '@bizx/ui';
import { resolveMediaUrl } from '../lib/media';

export const StoreMediaImage: React.FC<Omit<StoreMediaImageProps, 'resolveUrl'>> = (props) => {
  return <BaseStoreMediaImage resolveUrl={resolveMediaUrl} {...props} />;
};
