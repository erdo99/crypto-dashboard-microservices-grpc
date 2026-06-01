import axios from 'axios';

const apiBase = () => import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export type HealthStatus = 'online' | 'offline' | 'checking';

export type SystemHealthSnapshot = {
  goApi: HealthStatus;
  pythonGrpc: HealthStatus;
  checkedAt: Date | null;
};

export async function fetchGoApiHealth(): Promise<boolean> {
  try {
    const { data } = await axios.get<{ status?: string }>(`${apiBase()}/api/health`, {
      timeout: 5000,
    });
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/** Python gRPC has no direct HTTP probe; infer from a lightweight crypto list call. */
export async function probePythonGrpc(): Promise<boolean> {
  try {
    const { data } = await axios.get<{ success?: boolean }>(`${apiBase()}/api/crypto`, {
      params: { source: 'okx' },
      timeout: 8000,
    });
    return data.success === true;
  } catch {
    return false;
  }
}

export async function fetchSystemHealth(): Promise<SystemHealthSnapshot> {
  const [goOk, pythonOk] = await Promise.all([fetchGoApiHealth(), probePythonGrpc()]);
  return {
    goApi: goOk ? 'online' : 'offline',
    pythonGrpc: pythonOk ? 'online' : 'offline',
    checkedAt: new Date(),
  };
}

export const grpcAddress = () => import.meta.env.VITE_GRPC_ADDR ?? 'localhost:50051';

export const cacheTtlSeconds = () => {
  const raw = import.meta.env.VITE_CACHE_TTL_SECONDS;
  if (raw === undefined || raw === '') return 8;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : 8;
};
