"use client";

import { useState } from "react";
import Image from "next/image";

type UserAvatarProps = {
  src?: string | null;
  alt: string;
  initials: string;
  size: number;
  sizes: string;
  className?: string;
  initialsClassName?: string;
};

export function UserAvatar({
  src,
  alt,
  initials,
  size,
  sizes,
  className = "",
  initialsClassName = "",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!src || imageFailed) {
    return (
      <div className={initialsClassName}>
        {initials}
      </div>
    );
  }

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={sizes}
      unoptimized
      className={className}
      onError={() => setImageFailed(true)}
    />
  );
}
