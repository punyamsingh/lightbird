import Link from "next/link";
import { notFound } from "next/navigation";
import { guides } from "@/content/guides";
import { DiscoveryLinks } from "@/components/discovery-links";
import { StructuredData } from "@/components/structured-data";
import { pageMetadata, SITE_URL } from "@/lib/site";

export const dynamicParams = false;
type Props = { params: Promise<{ guide: string }> };

export function generateStaticParams() {
  return guides.map(({ page }) => ({ guide: page.path.slice(1) }));
}
async function getGuide(params: Props["params"]) {
  const { guide: slug } = await params;
  const guide = guides.find(({ page }) => page.path === `/${slug}`);
  if (!guide) notFound();
  return guide;
}
export async function generateMetadata({ params }: Props) {
  return pageMetadata((await getGuide(params)).page);
}

export default async function GuidePage({ params }: Props) {
  const guide = await getGuide(params);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-8">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 py-3 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
          <Link href="/" className="font-headline font-black tracking-widest text-primary">LIGHTBIRD</Link>
          <div className="flex flex-wrap gap-5 text-sm"><Link href="/">Player</Link><Link href="/docs">Docs</Link><Link href="/playground">Playground</Link></div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
        <StructuredData data={{
          "@context": "https://schema.org", "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "LightBird", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: guide.heading, item: new URL(guide.page.path, SITE_URL).toString() },
          ],
        }} />
        <article>
          <p className="mb-3 text-sm font-medium text-primary">{guide.audience}</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{guide.heading}</h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{guide.intro}</p>
          <Link href={guide.action.href} className="mt-8 inline-flex min-h-11 items-center rounded-md bg-primary px-5 py-3 font-medium text-primary-foreground">{guide.action.label}</Link>
          {guide.sections.map(({ heading, paragraphs, steps, code }) => (
            <section key={heading} className="mt-12">
              <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2>
              {paragraphs?.map((paragraph) => <p key={paragraph} className="mt-4 leading-relaxed text-muted-foreground">{paragraph}</p>)}
              {steps && <ol className="mt-5 list-decimal space-y-4 pl-6 leading-relaxed text-muted-foreground">{steps.map((step) => <li key={step}>{step}</li>)}</ol>}
              {code && <pre className="mt-5 overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm leading-relaxed"><code>{code}</code></pre>}
            </section>
          ))}
          <section className="mt-12" aria-labelledby="questions">
            <h2 id="questions" className="text-2xl font-semibold">Common questions</h2>
            {guide.questions.map(({ question, answer }) => (
              <details key={question} className="mt-4 rounded-lg border border-border p-4">
                <summary className="cursor-pointer font-medium leading-relaxed">{question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{answer}</p>
              </details>
            ))}
          </section>
          <p className="mt-10 text-muted-foreground">For setup details, APIs, and browser requirements, read the <Link href="/docs" className="text-foreground underline underline-offset-4">LightBird documentation</Link>.</p>
        </article>
      </main>
      <footer className="mx-auto max-w-5xl border-t border-border px-4 py-8 sm:px-6"><DiscoveryLinks /></footer>
    </div>
  );
}
