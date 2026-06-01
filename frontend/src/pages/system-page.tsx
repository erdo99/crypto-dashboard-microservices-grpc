import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  cacheTtlSeconds,
  fetchSystemHealth,
  grpcAddress,
  type HealthStatus,
} from '@/core/application/api/health-adapter';

const REFRESH_MS = 10_000;

type ServiceCard = {
  id: string;
  name: string;
  description: string;
  status: HealthStatus;
};

function statusBadge(status: HealthStatus) {
  if (status === 'checking') {
    return (
      <Badge variant="secondary" appearance="outline" size="md">
        Checking…
      </Badge>
    );
  }
  if (status === 'online') {
    return (
      <Badge variant="success" appearance="light" size="md">
        Online
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" appearance="light" size="md">
      Offline
    </Badge>
  );
}

function StatusDot({ ok }: { ok: boolean | null }) {
  const color =
    ok === null ? 'bg-muted-foreground' : ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  return <span className={`inline-block size-3 rounded-full ${color}`} aria-hidden />;
}

export default function SystemPage() {
  const [goApiOk, setGoApiOk] = useState<boolean | null>(null);
  const [pythonOk, setPythonOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const snapshot = await fetchSystemHealth();
      setGoApiOk(snapshot.goApi === 'online');
      setPythonOk(snapshot.pythonGrpc === 'online');
      setLastChecked(snapshot.checkedAt);
    } catch {
      setGoApiOk(false);
      setPythonOk(false);
      setLastChecked(new Date());
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const services: ServiceCard[] = [
    {
      id: 'frontend',
      name: 'Frontend',
      description: 'React + Vite (this app)',
      status: 'online',
    },
    {
      id: 'go-api',
      name: 'Go API Gateway',
      description: `REST · ${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}`,
      status: checking ? 'checking' : goApiOk ? 'online' : 'offline',
    },
    {
      id: 'python-grpc',
      name: 'Python gRPC Service',
      description: `gRPC · ${grpcAddress()}`,
      status: checking ? 'checking' : pythonOk ? 'online' : 'offline',
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 bg-linear-to-br from-primary/10 via-background to-cyan-400/10 p-6">
      <Card>
        <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Live health of the stack · auto-refresh every {REFRESH_MS / 1000}s
              {lastChecked ? ` · last check ${lastChecked.toLocaleTimeString()}` : ''}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={checking}>
            Refresh now
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <StatusDot ok={checking ? null : goApiOk} />
            <div>
              <p className="text-sm font-medium text-foreground">Go API health</p>
              <p className="text-xs text-muted-foreground">
                GET /api/health — {checking ? 'checking…' : goApiOk ? 'ok' : 'unreachable'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {services.map((svc) => (
              <Card key={svc.id} className="bg-card/90">
                <CardHeader className="min-h-0 border-b border-border py-4">
                  <div className="flex w-full items-start justify-between gap-2">
                    <CardTitle className="text-sm">{svc.name}</CardTitle>
                    {statusBadge(svc.status)}
                  </div>
                  <CardDescription className="text-xs">{svc.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-card/90">
              <CardHeader className="border-b border-border py-4">
                <CardTitle className="text-sm">gRPC connection</CardTitle>
                <CardDescription className="font-mono text-xs">{grpcAddress()}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 text-xs text-muted-foreground">
                Configured via <code className="text-foreground">VITE_GRPC_ADDR</code> (display) · Go uses{' '}
                <code className="text-foreground">CCXT_GRPC_ADDR</code>
              </CardContent>
            </Card>
            <Card className="bg-card/90">
              <CardHeader className="border-b border-border py-4">
                <CardTitle className="text-sm">Cache TTL</CardTitle>
                <CardDescription className="text-xs">
                  Python in-memory cache · {cacheTtlSeconds()}s default
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 text-xs text-muted-foreground">
                Set <code className="text-foreground">CRYPTO_CACHE_TTL_SECONDS</code> on the Python service · override
                display with <code className="text-foreground">VITE_CACHE_TTL_SECONDS</code>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
