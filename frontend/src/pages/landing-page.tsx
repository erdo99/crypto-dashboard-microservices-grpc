import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const STACK = ['React', 'Go', 'Python', 'gRPC', 'Protobuf'] as const;

function FlowNode({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 text-center shadow-sm">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center text-muted-foreground" aria-hidden>
      <span className="hidden text-xl sm:inline">→</span>
      <span className="text-lg sm:hidden">↓</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6 sm:py-16">
      <section className="space-y-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Real-time multi-exchange crypto</p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Crypto Dashboard</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          A modern stack for live prices from BTCTurk and OKX — React UI, Go REST gateway, and a Python gRPC
          service backed by Protobuf contracts.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map((tech) => (
            <Badge key={tech} variant="secondary" appearance="outline" size="md">
              {tech}
            </Badge>
          ))}
        </div>
        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open Dashboard
          </Link>
        </div>
      </section>

      <section>
        <Card className="border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle>Architecture</CardTitle>
            <CardDescription>End-to-end data flow from browser to exchanges</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
              <FlowNode label="React Frontend" sub="Vite + TypeScript" />
              <FlowArrow />
              <FlowNode label="Go API Gateway" sub="REST · :8080" />
              <FlowArrow />
              <FlowNode label="Python gRPC Service" sub="Protobuf · :50051" />
              <FlowArrow />
              <FlowNode label="BTCTurk / OKX" sub="Exchange APIs" />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
