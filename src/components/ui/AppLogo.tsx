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
};

/** App mark with width/height aligned to CSS so Next/Image does not warn in dev. */
export function AppLogo({ size = 32, className, priority }: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="SnapInterview Logo"
      width={size}
      height={size}
      priority={priority}
      className={cn(SIZE_CLASS[size], "shrink-0 rounded-lg", className)}
    />
  );
}
