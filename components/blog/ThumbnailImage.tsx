'use client';

import { useState } from 'react';

interface ThumbnailImageProps {
  /** Raw S3 key — component constructs the /api/blog/image?key=... URL */
  thumbnailKey?: string | null;
  /** Direct URL (e.g. coverImageUrl from the v1 API). Used when thumbnailKey is absent. */
  src?: string | null;
  alt: string;
  className?: string;
}

export default function ThumbnailImage({ thumbnailKey, src, alt, className }: ThumbnailImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  // thumbnailKey takes precedence; fall back to a direct src URL
  const imgSrc = thumbnailKey
    ? `/api/blog/image?key=${encodeURIComponent(thumbnailKey)}`
    : (src ?? null);

  if (!imgSrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
