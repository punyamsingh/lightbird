import { useEffect, useState, type RefObject } from "react";

/** Observe the embed, not the device: a desktop page can host a narrow player. */
export function useCompactLayout(ref: RefObject<HTMLElement | null>, breakpoint = 1024) {
  const [compact, setCompact] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setCompact(element.getBoundingClientRect().width < breakpoint);
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(element);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref, breakpoint]);
  return compact;
}
