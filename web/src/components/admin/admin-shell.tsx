'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AdminAnalytics, BrandRecord } from '@/lib/types';
import { useSessionStore } from '@/store/use-session-store';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type SystemHealth = {
  status: string;
  database: string;
  uptimeSeconds: number;
  generationLast24h: number;
  timestamp: string;
};

export function AdminShell() {
  const session = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [logs, setLogs] = useState<
    { id: string; style: string; totalPrice: number; createdAt: string; user: { email: string } }[]
  >([]);

  useEffect(() => {
    const run = async () => {
      if (!session.isHydrated) {
        await session.hydrate();
      }

      if (!session.tokens?.accessToken) {
        setLoading(false);
        return;
      }

      try {
        const [analyticsData, healthData, brandData, logsData] = await Promise.all([
          api.adminAnalytics(session.tokens.accessToken),
          api.adminSystemHealth(session.tokens.accessToken),
          api.adminBrands(session.tokens.accessToken),
          api.adminLogs(session.tokens.accessToken),
        ]);

        setAnalytics(analyticsData as AdminAnalytics);
        setHealth(healthData as SystemHealth);
        setBrands(brandData);
        setLogs(logsData as { id: string; style: string; totalPrice: number; createdAt: string; user: { email: string } }[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [session.isHydrated, session.hydrate, session.tokens?.accessToken]);

  if (!session.isHydrated || loading) {
    return <p className="text-sm text-[var(--ink-muted)]">Loading admin panel...</p>;
  }

  if (!session.user || session.user.role !== 'ADMIN') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Admin role required to access this panel.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Badge>ADMIN</Badge>
          <h1 className="mt-2 text-3xl font-semibold text-[var(--ink-white)]">GOTHYXAN Control Center</h1>
          <p className="text-sm text-[var(--ink-muted)]">Brands, tiers, logs, analytics, system health.</p>
        </div>
        <Link href="/dashboard">
          <Button variant="secondary">Back to app</Button>
        </Link>
      </div>

      {error ? <p className="rounded-md bg-[#3a1c1f] p-3 text-sm text-[#f7b9be]">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Users" value={analytics?.usersTotal ?? 0} />
        <MetricCard label="Verified" value={analytics?.verifiedUsers ?? 0} />
        <MetricCard label="Generations" value={analytics?.generationsTotal ?? 0} />
        <MetricCard label="Active Brands" value={analytics?.activeBrands ?? 0} />
        <MetricCard label="Avg Outfit Price" value={analytics?.avgOutfitPrice ?? 0} prefix="$" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Generations 24h" value={analytics?.generationsLast24h ?? 0} />
        <MetricCard label="Generations 7d" value={analytics?.generationsLast7d ?? 0} />
        <MetricCard label="Active Users 7d" value={analytics?.activeUsers7d ?? 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <MetricCard label="Image Success Rate %" value={Math.round(analytics?.imageSuccessRate ?? 0)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>System health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[var(--ink-muted)]">
            <p>Status: {health?.status ?? 'unknown'}</p>
            <p>Database: {health?.database ?? 'unknown'}</p>
            <p>Uptime: {health?.uptimeSeconds ?? 0}s</p>
            <p>Generations last 24h: {health?.generationLast24h ?? 0}</p>
            <p>Snapshot: {health?.timestamp ?? '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top styles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(analytics?.topStyles ?? []).map((style) => (
              <div key={style.style} className="flex items-center justify-between rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm">
                <span className="text-[var(--ink-white)]">{style.style}</span>
                <span className="text-[var(--ink-muted)]">{style._count.style}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Trending styles (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(analytics?.trendingStyles7d ?? []).map((style) => (
              <div key={style.style} className="flex items-center justify-between rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm">
                <span className="text-[var(--ink-white)]">{style.style}</span>
                <span className="text-[var(--ink-muted)]">{style._count.style}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top brands (7d)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(analytics?.topBrands7d ?? []).map((item) => (
              <div key={item.brand} className="flex items-center justify-between rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm">
                <span className="text-[var(--ink-white)]">{item.brand}</span>
                <span className="text-[var(--ink-muted)]">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget mode usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(analytics?.budgetModeBreakdown ?? []).map((item) => (
              <div
                key={item.budgetMode}
                className="flex items-center justify-between rounded-md bg-[var(--panel-soft)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--ink-white)]">{item.budgetMode}</span>
                <span className="text-[var(--ink-muted)]">{item._count.budgetMode}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brands and tiers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {brands.map((brand) => (
            <div key={brand.id} className="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm">
              <p className="font-medium text-[var(--ink-white)]">
                {brand.name} <span className="text-[var(--brand-main)]">Tier {brand.tier}</span>
              </p>
              <p className="text-xs text-[var(--ink-muted)]">{brand.items.length} items</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest generation logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            >
              <p className="truncate text-[var(--ink-white)]">
                {log.user.email}
                {' -> '}
                {log.style}
              </p>
              <p className="text-[var(--ink-muted)]">${log.totalPrice}</p>
              <p className="text-[var(--ink-muted)]">{new Date(log.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, prefix = '' }: { label: string; value: number; prefix?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-[var(--ink-white)]">
          {prefix}
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
