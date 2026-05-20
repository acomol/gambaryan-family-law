"use client";

import { useInView } from "@/hooks/useInView";
import type { CSSProperties } from "react";

interface WordRevealProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  stagger?: number;
  duration?: number;
  as?: "p" | "h1" | "h2" | "h3" | "span";
}

export default function WordReveal({
  text,
  className = "",
  style = {},
  stagger = 0.04,
  duration = 0.6,
  as: Tag = "p",
}: WordRevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 });

  const words = text.split(" ");

  return (
    <div ref={ref} style={{ overflow: "hidden" }}>
      <Tag className={className} style={style}>
        {words.map((word, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              overflow: "hidden",
              marginRight: "0.3em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: inView ? "translateY(0)" : "translateY(100%)",
                opacity: inView ? 1 : 0,
                transition: `transform ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * stagger}s, opacity ${duration * 0.6}s ease ${i * stagger}s`,
                willChange: "transform, opacity",
              }}
            >
              {word}
            </span>
          </span>
        ))}
      </Tag>
    </div>
  );
}
