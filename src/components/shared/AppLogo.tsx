"use client";

import { cn } from "@/lib/utils";

interface AppLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  dark?: boolean;
}

export function AppLogo({
  size = 40,
  className,
  showText = false,
  textClassName,
  dark = false,
}: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src="/logo.png"
        alt="Faco Vehicle Mgt App"
        width={size}
        height={size}
        className="rounded-lg object-contain shrink-0"
        style={{ width: size, height: size }}
      />
      {showText && (
        <div className="min-w-0">
          <h1
            className={cn(
              "font-bold leading-tight tracking-tight truncate",
              dark ? "text-white" : "text-slate-900",
              size >= 48 ? "text-lg" : "text-[1.05rem]"
            )}
          >
            Faco Vehicle Mgt App
          </h1>
          <p
            className={cn(
              "text-[11px] mt-0.5 truncate",
              dark ? "text-slate-400" : "text-slate-500",
              textClassName
            )}
          >
            Fleet Management System
          </p>
        </div>
      )}
    </div>
  );
}
