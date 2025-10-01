import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function safeFetch(input: RequestInfo, init?: RequestInit) {
  try {
    // Abort after 7s to avoid hanging polls
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(input, { ...(init as any), signal: (init as any)?.signal ?? controller.signal } as any);
    clearTimeout(id);
    return res;
  } catch (e) {
    // Swallow fetch errors to avoid noisy console; callers must handle null
    return null;
  }
}

// Simple GET cache using sessionStorage. Returns Response-like object with json() method.
export async function apiFetch(path: string, init?: RequestInit) {
  try {
    if (typeof navigator !== 'undefined' && navigator && 'onLine' in navigator && (navigator as any).onLine === false) {
      return null as any;
    }
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
    const isAbs = /^https?:/i.test(path);
    const candidates: string[] = [];
    if (isAbs) {
      candidates.push(path);
    } else {
      candidates.push(path);
      if (origin) candidates.push(`${origin}${path}`);
    }
    if (path.startsWith('/api/')) {
      const netlify = `/.netlify/functions${path}`;
      candidates.push(netlify);
      if (origin) candidates.push(`${origin}${netlify}`);
    }
    const seen = new Set<string>();
    let last: Response | null = null;
    for (const url of candidates) {
      if (seen.has(url)) continue;
      seen.add(url);
      const res = await safeFetch(url, init as any);
      if (res && res.ok) return res;
      last = res;
    }
    return last as any;
  } catch {
    return null as any;
  }
}

export async function cachedFetch(input: string, init?: RequestInit, ttl = 5 * 60 * 1000) {
  // only cache GET requests
  const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
  if (method !== 'GET') return safeFetch(input, init as any);
  try {
    const key = `cache:${input}`;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.ts && (Date.now() - parsed.ts) < ttl && parsed.data !== undefined) {
          return {
            ok: true,
            status: 200,
            json: async () => parsed.data,
            text: async () => JSON.stringify(parsed.data),
          } as unknown as Response;
        }
      } catch (e) { /* ignore parse errors */ }
    }
  } catch (e) { /* ignore session failures */ }

  const res = await safeFetch(input, init);
  if (!res || !res.ok) return res;
  try {
    const data = await res.clone().json().catch(()=>null);
    try {
      sessionStorage.setItem(`cache:${input}`, JSON.stringify({ ts: Date.now(), data }));
    } catch (e) { /* ignore storage errors */ }
  } catch (e) { /* ignore json parse */ }
  return res;
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aa = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}
