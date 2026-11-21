import Link from "next/link";
import { guides } from "@/content/guides";
import { REPOSITORY_URL } from "@/lib/site";

export function DiscoveryLinks() {
  return (
    <nav aria-label="Explore LightBird" className="flex flex-wrap gap-x-6 gap-y-3 text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_a]:underline [&_a]:underline-offset-4">
      <Link href="/">Online video player</Link>
      {guides.map(({ page }) => <Link key={page.path} href={page.path}>{page.title.split(" | ")[0]}</Link>)}
      <Link href="/docs">Documentation</Link>
      <Link href="/playground">Developer playground</Link>
      <a href={REPOSITORY_URL}>Source on GitHub</a>
    </nav>
  );
}
