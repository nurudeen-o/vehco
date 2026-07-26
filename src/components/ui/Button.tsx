import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#0F6B4B] hover:bg-[#0c573d] text-white focus:ring-[#0F6B4B]",
    secondary: "bg-[#1E8E5A] hover:bg-[#18754a] text-white focus:ring-[#1E8E5A]",
    outline: "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 focus:ring-slate-400",
    ghost: "hover:bg-slate-100 text-slate-700 focus:ring-slate-400",
    danger: "bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-600",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
