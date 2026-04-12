/** Base URL for API calls. Empty string uses same origin (Vite dev proxy → backend). */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  return (raw ?? "").replace(/\/$/, "");
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { error?: string; message?: string };
    return j.error || j.message || text || res.statusText;
  } catch {
    return text || res.statusText;
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const headers = new Headers(init?.headers);
  if (init?.body && typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function readFetchError(res: Response): Promise<string> {
  return readErrorMessage(res);
}
