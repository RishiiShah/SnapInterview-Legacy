import Image from "next/image";

type UserAvatarProps = {
  src?: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
};

function isGoogleAvatarUrl(src: string) {
  try {
    return new URL(src).hostname.endsWith("googleusercontent.com");
  } catch {
    return false;
  }
}

/**
 * Renders user profile photos. Google avatars skip Next.js optimization because
 * Google's CDN returns 403 to server-side fetches from the image optimizer.
 */
export function UserAvatar({
  src,
  alt,
  className,
  fill,
  sizes,
  width,
  height,
}: UserAvatarProps) {
  if (!src) return null;

  const googleAvatar = isGoogleAvatarUrl(src);

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        fill
        sizes={sizes}
        unoptimized={googleAvatar}
        referrerPolicy={googleAvatar ? "no-referrer" : undefined}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      width={width ?? 32}
      height={height ?? 32}
      unoptimized={googleAvatar}
      referrerPolicy={googleAvatar ? "no-referrer" : undefined}
    />
  );
}
