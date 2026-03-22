'use client';

import { useState } from 'react';

interface ThumbnailImageProps {
  thumbnailKey: string;
  alt: string;
  className?: string;
}

export default function ThumbnailImage({ thumbnailKey, alt, className }: ThumbnailImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/blog/image?key=${encodeURIComponent(thumbnailKey)}`}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
