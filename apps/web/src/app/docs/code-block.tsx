"use client";

import { useCallback, useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      className="docs-copy-btn absolute top-3 right-3 px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-muted-foreground transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function CodeBlock({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={`docs-code-block relative group ${className}`}>
      <pre className="bg-[hsl(0,0%,6%)] border border-white/[0.06] rounded-xl p-5 overflow-x-auto text-sm leading-relaxed font-code">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}
