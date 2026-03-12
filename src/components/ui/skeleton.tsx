import { cn } from "@/utils/helpers";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-200/50 dark:bg-zinc-800/50", className)}
      {...props}
    />
  );
}

export { Skeleton };
