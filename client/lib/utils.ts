import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function safeFetch(input: RequestInfo, init?: RequestInit) {
  try {
    const res = await fetch(input, init);
    return res;
  } catch (e) {
    console.warn('safeFetch failed', input, e);
    return null;
  }
}

// Simple GET cache using sessionStorage. Returns Response-like object with json() method.
export async function apiFetch(path: string, init?: RequestInit) {
  try {
    const primary = path;
    const res1 = await safeFetch(primary, init as any);
    if (res1 && res1.ok) return res1;
    const fallback = path.startsWith('/api/') ? (`/.netlify/functions${path}`) : path;
    if (fallback !== primary) {
      const res2 = await safeFetch(fallback, init as any);
      if (res2 && res2.ok) return res2;
      return res2;
    }
    return res1;
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
