import Image from "next/image";
import { cn } from "@/utils/helpers";

type AppLogoSize = 28 | 32 | 36;

type AppLogoProps = {
  size?: AppLogoSize;
  className?: string;
  priority?: boolean;
  /**
   * When true (default), the mark is decorative because brand text or an
   * aria-label on the parent already names the control.
   */
  decorative?: boolean;
  /** Used when decorative is false (standalone logo without adjacent label). */
  alt?: string;
};

/**
 * App mark with matching width/height props and inline styles. logo.png is not
 * square (479×520); forcing both CSS axes to `size` keeps the mark square and
 * stops Next/Image from warning when only one rendered dimension drifts.
 */
export function AppLogo({
  size = 32,
  className,
  priority,
  decorative = true,
  alt,
}: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt={decorative ? "" : (alt ?? "SnapInterview")}
      aria-hidden={decorative ? true : undefined}
      width={size}
      height={size}
      priority={priority}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-lg", className)}
    />
  );
}
