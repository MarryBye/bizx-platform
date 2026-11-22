import React from 'react';
import { sanitizeUiUrl } from '../lib/security';

export interface SafeExternalLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'rel' | 'target'> {
  href: string | null | undefined;
  allowRelative?: boolean;
  openInNewTab?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Secure external link primitive.
 * Automatically validates href against http(s) / safe relative paths and enforces
 * rel="noopener noreferrer" to prevent reverse tabnabbing and javascript: injection.
 */
export const SafeExternalLink: React.FC<SafeExternalLinkProps> = ({
  href,
  allowRelative = false,
  openInNewTab = true,
  fallback = null,
  children,
  ...rest
}) => {
  const safeHref = sanitizeUiUrl(href, { allowRelative });
  if (!safeHref) {
    return <>{fallback}</>;
  }

  return (
    <a
      href={safeHref}
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : 'noreferrer'}
      {...rest}
    >
      {children}
    </a>
  );
};
