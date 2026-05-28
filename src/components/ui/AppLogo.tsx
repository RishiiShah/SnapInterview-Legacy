import Image from "next/image";
import { cn } from "@/utils/helpers";

const SIZE_CLASS = {
  28: "size-7",
  32: "size-8",
  36: "size-9",
} as const;

type AppLogoSize = keyof typeof SIZE_CLASS;

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

/** App mark with width/height aligned to CSS so Next/Image does not warn in dev. */
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
      className={cn(SIZE_CLASS[size], "shrink-0 rounded-lg", className)}
    />
  );
}
