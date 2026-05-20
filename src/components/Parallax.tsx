"use client";

import { useEffect, useRef, useState } from "react";

interface ParallaxProps {
  src: string;
  alt: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Parallax({
  src,
  alt,
  speed = 0.15,
  className = "",
  style = {},
}: ParallaxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;

      if (rect.bottom < 0 || rect.top > windowH) return;

      const progress = (windowH - rect.top) / (windowH + rect.height);
      const shift = (progress - 0.5) * rect.height * speed;
      setOffset(shift);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: "hidden", position: "relative", ...style }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          height: "120%",
          objectFit: "cover",
          transform: `translate3d(0, ${offset}px, 0)`,
          willChange: "transform",
          position: "absolute",
          top: "-10%",
          left: 0,
        }}
      />
    </div>
  );
}
