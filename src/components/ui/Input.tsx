import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={[
          "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none",
          "placeholder:text-zinc-600 transition-all",
          "focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-100",
          "disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-600",
          className,
        ].join(" ")}
        {...props}
      />
    );
  }
);
