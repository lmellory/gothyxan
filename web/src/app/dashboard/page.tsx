import { ChatShell } from '@/components/chat/chat-shell';

export default function DashboardPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1400px] px-5 py-8 md:px-10">
      <div className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--brand-main)]">Web Application</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--ink-white)]">Outfit Intelligence</h1>
      </div>
      <ChatShell />
    </main>
  );
}
