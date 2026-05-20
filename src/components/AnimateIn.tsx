"use client";

import { useInView } from "@/hooks/useInView";
import type { CSSProperties, ReactNode } from "react";

type AnimateVariant = "fade-up" | "fade" | "slide-left" | "slide-right" | "scale";

interface AnimateInProps {
  children: ReactNode;
  variant?: AnimateVariant;
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  as?: keyof HTMLElementTagNameMap;
  threshold?: number;
}

const hiddenStyles: Record<AnimateVariant, CSSProperties> = {
  "fade-up": { opacity: 0, transform: "translateY(40px)" },
  fade: { opacity: 0 },
  "slide-left": { opacity: 0, transform: "translateX(-40px)" },
  "slide-right": { opacity: 0, transform: "translateX(40px)" },
  scale: { opacity: 0, transform: "scale(0.95)" },
};

const visibleStyles: Record<AnimateVariant, CSSProperties> = {
  "fade-up": { opacity: 1, transform: "translateY(0)" },
  fade: { opacity: 1 },
  "slide-left": { opacity: 1, transform: "translateX(0)" },
  "slide-right": { opacity: 1, transform: "translateX(0)" },
  scale: { opacity: 1, transform: "scale(1)" },
};

export default function AnimateIn({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 0.8,
  className = "",
  style = {},
  threshold = 0.15,
}: AnimateInProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold });

  const baseTransition = `opacity ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s, transform ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}s`;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        transition: baseTransition,
        willChange: "opacity, transform",
        ...(inView ? visibleStyles[variant] : hiddenStyles[variant]),
      }}
    >
      {children}
    </div>
  );
}
