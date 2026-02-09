import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const VARIANTS = {
  default:
    "bg-terminal-green text-terminal-black hover:bg-terminal-green-dim",
  destructive:
    "bg-terminal-red text-terminal-black hover:bg-terminal-red-dim",
  outline:
    "border border-terminal-green text-terminal-green hover:bg-terminal-green/10",
  ghost:
    "text-terminal-green hover:bg-terminal-green/10",
};

const SIZES = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-mono font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
          VARIANTS[variant],
          SIZES[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
