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
 * App mark. logo.png is not square (479×520); keep intrinsic aspect via
 * height: auto so Next/Image does not warn when CSS sizes one axis.
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
      width={479}
      height={520}
      priority={priority}
      style={{ width: size, height: "auto" }}
      className={cn("shrink-0 rounded-lg", className)}
    />
  );
}
