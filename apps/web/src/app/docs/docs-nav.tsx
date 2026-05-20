"use client";

import { useEffect, useState } from "react";

const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "install", label: "Installation" },
  { id: "all-features", label: "All Features" },
  {
    id: "api",
    label: "API Reference",
    children: [
      { id: "api-core", label: "Core" },
      { id: "api-hooks", label: "React Hooks" },
      { id: "api-ui", label: "UI Components" },
    ],
  },
  { id: "browser-support", label: "Browser Support" },
] as const;

const ALL_IDS = NAV_SECTIONS.flatMap((s) =>
  "children" in s && s.children ? [s.id, ...s.children.map((c) => c.id)] : [s.id]
);

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const topMost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActive(topMost.target.id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function Sidebar({ active }: { active: string }) {
  return (
    <nav className="hidden lg:block fixed top-0 left-0 w-64 h-screen pt-8 pb-12 pl-8 pr-6 overflow-y-auto border-r border-white/[0.06]">
      <a href="/" className="flex items-center gap-2 mb-10 group">
        <span className="text-lg font-headline font-black tracking-widest text-[hsl(207,100%,60%)] group-hover:text-[hsl(207,100%,70%)] transition-colors">
          LIGHTBIRD
        </span>
      </a>
      <ul className="space-y-1">
        {NAV_SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`docs-nav-link block py-1.5 text-sm transition-colors ${
                active === s.id
                  ? "docs-nav-link-active font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </a>
            {"children" in s && s.children && (
              <ul className="ml-4 mt-1 space-y-1">
                {s.children.map((c) => (
                  <li key={c.id}>
                    <a
                      href={`#${c.id}`}
                      className={`docs-nav-link block py-1 text-xs transition-colors ${
                        active === c.id
                          ? "docs-nav-link-active font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-10 pt-6 border-t border-white/[0.06] space-y-2">
        <a
          href="https://github.com/punyamsingh/lightbird"
          className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://www.npmjs.com/package/lightbird"
          className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          npm
        </a>
      </div>
    </nav>
  );
}

function MobileNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-4 h-14">
        <a href="/" className="text-sm font-headline font-black tracking-widest text-[hsl(207,100%,60%)]">
          LIGHTBIRD
        </a>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label="Toggle navigation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 border-b border-white/[0.06] bg-background">
          <ul className="space-y-1">
            {NAV_SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setOpen(false)}
                  className={`block py-1.5 text-sm ${
                    active === s.id ? "text-[hsl(207,100%,60%)] font-medium" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DocsNav() {
  const active = useScrollSpy(ALL_IDS);

  return (
    <>
      <Sidebar active={active} />
      <MobileNav active={active} />
    </>
  );
}
