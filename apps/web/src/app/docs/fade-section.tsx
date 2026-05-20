"use client";

import { useEffect, useRef, useState } from "react";

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    setVisible(false);
    setAnimated(true);
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!animated) return { ref, className: "" };
  return {
    ref,
    className: visible ? "docs-section-visible" : "docs-section-hidden",
  };
}

export function FadeSection({ children }: { children: React.ReactNode }) {
  const { ref, className } = useFadeIn();
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
