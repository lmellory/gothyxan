import Link from 'next/link';
import { ArrowRight, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-10 md:px-10">
      <header className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--brand-main)]">GOTHYXAN</p>
        <Link
          href="/auth"
          className="inline-flex items-center rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--ink-white)]"
        >
          Sign in
        </Link>
      </header>

      <section className="mt-14 grid flex-1 items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-[var(--ink-white)] md:text-6xl">
            Premium AI outfit intelligence using only branded clothing.
          </h1>
          <p className="mt-5 max-w-xl text-base text-[var(--ink-muted)] md:text-lg">
            Select style, weather context, occasion, and budget mode. Get strict JSON outfits with tier-based
            branded items only.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-main)] px-5 py-3 font-semibold text-[var(--ink-black)] transition hover:bg-[var(--brand-main-strong)]"
            >
              Open Web App <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <FeatureCard icon={<Sparkles size={18} />} title="AI Pipeline">
            {'Input Analyzer -> Context Builder -> Style Classifier -> Budget Engine -> Brand Selector.'}
          </FeatureCard>
          <FeatureCard icon={<ShieldCheck size={18} />} title="Security">
            Email verification with code expiry and attempts limit, JWT, refresh tokens, RBAC.
          </FeatureCard>
          <FeatureCard icon={<Layers size={18} />} title="Structured Output">
            Strict JSON format for top, bottom, shoes, outerwear, accessories, and explanation.
          </FeatureCard>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-white)]">
        <span className="text-[var(--brand-main)]">{icon}</span>
        {title}
      </p>
      <p className="text-sm text-[var(--ink-muted)]">{children}</p>
    </article>
  );
}
