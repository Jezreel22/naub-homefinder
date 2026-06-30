"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Brand logo for NAUB Home Finder. A stylized house with a warm, "home-like"
 * silhouette: pitched red roof, white walls, a door, a lit window, and a
 * chimney. Renders as inline SVG so it scales crisply at any size.
 *
 * Two visual variants:
 * - `variant="solid"`  (default): red rounded square background with white
 *   house — for use on white/light surfaces (NavBar, mobile logo, footer).
 * - `variant="glass"`:            white-tinted translucent square with white
 *   house — for use on the red gradient side panel of the login/register pages.
 *
 * The brand red is preserved at #FF5A5F so the logo ties to the existing
 * primary color and links/buttons.
 */
export interface LogoProps {
  size?: number;       // px, square. Defaults to 36.
  variant?: "solid" | "glass";
  className?: string;
}

export default function Logo({ size = 36, variant = "solid", className }: LogoProps) {
  const isGlass = variant === "glass";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden",
        className
      )}
      style={{
        width: size,
        height: size,
        background: isGlass
          ? "rgba(255,255,255,0.20)"
          : "#FF5A5F",
        // Subtle inner ring so the glass variant reads as a chip on the gradient
        boxShadow: isGlass ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : undefined,
      }}
      aria-label="NAUB Home Finder"
      role="img"
    >
      <svg
        viewBox="0 0 32 32"
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Subtle backdrop hint so the house sits on a soft sky band */}
        <defs>
          <linearGradient id="nhf-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FFE9E9" />
          </linearGradient>
          <linearGradient id="nhf-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F1F1F1" />
          </linearGradient>
          <linearGradient id="nhf-roof-shadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C7363A" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#7A2225" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Soft sky band — barely visible, gives the mark depth */}
        <rect x="2" y="6" width="28" height="22" rx="3" fill="rgba(255,255,255,0.10)" />

        {/* Walls (white) */}
        <rect x="6" y="14" width="20" height="14" rx="1.2" fill="url(#nhf-wall)" />

        {/* Door (deep red) */}
        <rect x="14" y="20" width="4" height="8" rx="0.6" fill="#9B2A2E" />
        <circle cx="17.2" cy="24.2" r="0.4" fill="#FFD66B" />

        {/* Window (warm light = "home") */}
        <rect x="8.5" y="17" width="4" height="4" rx="0.4" fill="#FFC56B" />
        <line x1="10.5" y1="17" x2="10.5" y2="21" stroke="#9B2A2E" strokeWidth="0.5" />
        <line x1="8.5" y1="19" x2="12.5" y2="19" stroke="#9B2A2E" strokeWidth="0.5" />

        {/* Chimney */}
        <rect x="20" y="6" width="2.4" height="4.5" fill="#FFFFFF" />
        <rect x="20" y="6" width="2.4" height="1" fill="#7A2225" opacity="0.6" />

        {/* Roof (warm red) */}
        <polygon points="4,15 16,5 28,15" fill="url(#nhf-roof)" />
        {/* Roof shadow gradient overlay */}
        <polygon points="4,15 16,5 28,15" fill="url(#nhf-roof-shadow)" />
        {/* Eaves line */}
        <line x1="3.5" y1="15" x2="28.5" y2="15" stroke="#7A2225" strokeWidth="0.7" />

        {/* Tiny ground line so the house "sits" */}
        <line x1="5" y1="28" x2="27" y2="28" stroke="#7A2225" strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
      </svg>
    </span>
  );
}
