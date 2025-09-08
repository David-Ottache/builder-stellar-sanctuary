import React from 'react';
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  pickupCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  // called when user clicks/taps the map with picked coords
  onPickDestination?: (c: { lat: number; lng: number }) => void;
  onPick?: (c: { lat: number; lng: number }) => void;
  // optional mode to indicate which location is being selected ('pickup' | 'destination' | undefined)
  pickMode?: 'pickup' | 'destination' | null;
  // when true, do not render the pickup pin marker (useful for root page)
  hidePickupMarker?: boolean;
}

export default function MapView({ className, pickupCoords, destinationCoords, onPickDestination, onPick, pickMode, hidePickupMarker }: Props) {
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markersRef = React.useRef<any[]>([]);

  // center map around pickup if available, otherwise default to Abuja
  const center = pickupCoords ?? { lat: 9.0765, lng: 7.3986 };

  React.useEffect(() => {
    if (!googleKey) return;
    if (!containerRef.current) return;

    let mounted = true;
    const loadScript = (src: string) => new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });

    (async () => {
      try {
        await loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleKey)}&libraries=places`);
        if (!mounted) return;
        if (!(window as any).google) return;
        const google = (window as any).google;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          disableDefaultUI: true,
        });

        mapRef.current.addListener('click', (ev: any) => {
          const lat = ev.latLng.lat();
          const lng = ev.latLng.lng();
          const coords = { lat, lng };
          try { if (onPick) onPick(coords); } catch(e){}
          try { if (onPickDestination && (!pickMode || pickMode === 'destination')) onPickDestination(coords); } catch(e){}
        });

        // presence: prefer SSE (server streams from Firestore) and fallback to polling
        try {
          const markersById: Record<string, any> = {};
          markersRef.current = [];

          const renderPresence = (presence: any[]) => {
            if (!mapRef.current) return;
            // remove markers not present
            const keep = new Set(presence.map(p=>String(p.id)));
            Object.keys(markersById).forEach(k => { if (!keep.has(k)) { markersById[k].setMap(null); delete markersById[k]; } });

            presence.forEach((p:any) => {
              if (!p.lat || !p.lng) return;
              const id = String(p.id);
              const pos = new google.maps.LatLng(p.lat, p.lng);
              if (markersById[id]) {
                markersById[id].setPosition(pos);
              } else {
                const m = new google.maps.Marker({ position: pos, map: mapRef.current, title: id, label: { text: id, color: '#fff' }, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: p.online ? '#0ea5a5' : '#888', fillOpacity: 1, scale: 7, strokeColor: '#fff', strokeWeight: 2 } });
                markersById[id] = m;
              }
            });

            // convert to array for cleanup reference
            markersRef.current = Object.values(markersById);
          };

          let pollInterval: any = null;
          let es: EventSource | null = null;

          const fetchPresence = async () => {
            try {
              const hdr = {} as any;
              const sessionRaw = sessionStorage.getItem('session.user');
              if (sessionRaw) {
                try { hdr['x-user-id'] = JSON.parse(sessionRaw).id; } catch(e){}
              }
              const origin = window.location.origin;
              const endpoints = [`${origin}/api/presence`, `${origin}/.netlify/functions/api/presence`, '/api/presence', '/.netlify/functions/api/presence'];
              let res: Response | null = null;
              for (const url of endpoints) {
                try {
                  res = await fetch(url, { headers: hdr, cache: 'no-store' });
                  if (res && res.ok) break;
                } catch (err) {
                  // try next
                  res = null;
                  continue;
                }
              }
              if (!res || !res.ok) return;
              const data = await res.json().catch(()=>null);
              if (!data) return;
              renderPresence(data.presence || []);
            } catch (e) { console.warn('fetchPresence failed', e); }
          };

          // try SSE first
          try {
            if ((window as any).EventSource) {
              try {
                const origin = window.location.origin;
                es = new EventSource(`${origin}/api/presence/stream`);
              } catch(e) {
                es = new EventSource('/api/presence/stream');
              }
              es.onmessage = (ev: MessageEvent) => {
                try {
                  const payload = JSON.parse(ev.data || '{}');
                  if (payload && payload.presence) renderPresence(payload.presence || []);
                } catch (e) { /* ignore parse errors */ }
              };
              es.onerror = () => {
                try { es?.close(); } catch (e) {}
                es = null;
                // fallback to polling
                fetchPresence().then(()=> { pollInterval = window.setInterval(fetchPresence, 5000); });
              };
            } else {
              // no EventSource, start polling
              await fetchPresence();
              pollInterval = window.setInterval(fetchPresence, 5000);
            }
          } catch (e) {
            // SSE failed, fallback to polling
            await fetchPresence();
            pollInterval = window.setInterval(fetchPresence, 5000);
          }

          // geolocation watch to post presence
          let watchId: number | null = null;
          if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(async (pos) => {
              try {
                const lat = pos.coords.latitude; const lng = pos.coords.longitude;
                const sessionRaw = sessionStorage.getItem('session.user');
                let userId: string | null = null;
                if (sessionRaw) {
                  try { userId = JSON.parse(sessionRaw).id; } catch(e){}
                }
                if (!userId) return;
                const origin = window.location.origin;
                const endpoints = [`${origin}/api/presence`, `${origin}/.netlify/functions/api/presence`, '/api/presence', '/.netlify/functions/api/presence'];
                let posted = false;
                for (const url of endpoints) {
                  try {
                    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ id: userId, lat, lng, online: true }) , keepalive: true });
                    if (r && r.ok) { posted = true; break; }
                  } catch (err) {
                    // ignore and try next
                  }
                }
                if (!posted) {
                  // nothing to do, but avoid throwing
                  // console.warn('presence post failed for all endpoints');
                }
              } catch (e) { console.warn('watchPosition post failed', e); }
            }, (err)=>{ /* ignore */ }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
          }

          // cleanup on unmount
          (mapRef.current as any).__presenceCleanup = () => {
            try { if (pollInterval) window.clearInterval(pollInterval); } catch(e){}
            try { if (es) { es.close(); es = null; } } catch(e){}
            try { if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId); } catch(e){}
            try { Object.values(markersById).forEach((m:any)=>m.setMap(null)); } catch(e){}
          };

        } catch (e) { /* swallow presence init errors */ }

      } catch (e) {
        console.warn('Failed loading Google Maps', e);
      }
    })();

    return () => {
      mounted = false;
      try { if (mapRef.current && (mapRef.current as any).__presenceCleanup) (mapRef.current as any).__presenceCleanup(); } catch(e){}
    };
  }, [googleKey]);

  // synchronize markers from pickup/destination when not using google maps
  React.useEffect(()=>{
    try {
      const g = (window as any).google;
      if (!g || !g.maps) return;
      if (!mapRef.current) return;
      // keep refs on mapRef to store markers
      const mRef: any = (mapRef.current as any).__customMarkers || { pickup: null, dest: null };
      if (!mRef.pickup) {
        try {
          mRef.pickup = new g.maps.Marker({ map: mapRef.current, visible: false, icon: { path: g.maps.SymbolPath.CIRCLE, fillColor: '#0ea5a5', fillOpacity: 1, scale: 7, strokeColor: '#fff', strokeWeight: 2 } });
        } catch(e) { mRef.pickup = null; }
      }
      if (!mRef.dest) {
        try {
          mRef.dest = new g.maps.Marker({ map: mapRef.current, visible: false, icon: { path: g.maps.SymbolPath.BACKWARD_CLOSED_ARROW, fillColor: '#ef4444', fillOpacity: 1, scale: 6, strokeColor: '#fff', strokeWeight: 2 } });
        } catch(e) { mRef.dest = null; }
      }

      try {
        if (mRef.pickup) {
          if (pickupCoords) {
            mRef.pickup.setPosition(pickupCoords);
            mRef.pickup.setVisible(!hidePickupMarker);
            if (!hidePickupMarker) {
              try { mapRef.current.setCenter(pickupCoords); } catch(e){}
            }
          } else {
            mRef.pickup.setVisible(false);
          }
        }
      } catch(e) {}

      try {
        if (mRef.dest) {
          if (destinationCoords) {
            mRef.dest.setPosition(destinationCoords);
            mRef.dest.setVisible(true);
          } else {
            mRef.dest.setVisible(false);
          }
        }
      } catch(e) {}

      (mapRef.current as any).__customMarkers = mRef;
    } catch(e) { /* ignore */ }
  }, [pickupCoords, destinationCoords, hidePickupMarker, googleKey]);

  const project = (coords?: { lat: number; lng: number } | null, rect?: DOMRect | null) => {
    if (!coords || !rect) return { left: 0, top: 0, visible: false };
    const deltaLat = 0.12;
    const xRatio = ((coords.lng - center.lng) / (deltaLat * (rect.width / rect.height))) + 0.5;
    const yRatio = 0.5 - ((coords.lat - center.lat) / deltaLat);
    return { left: Math.max(0, Math.min(1, xRatio)) * rect.width, top: Math.max(0, Math.min(1, yRatio)) * rect.height, visible: true };
  };

  // render
  return (
    <div
      className={cn(
        "relative h-[calc(100vh-3.5rem-6rem)] w-full select-none overflow-hidden rounded-none",
        className,
      )}
    >
      {/* If Google Maps key present, show real map */}
      {googleKey ? (
        <div ref={containerRef} className="absolute inset-0" />
      ) : (
        <div
          className="absolute inset-0"
          onClick={(e)=>{
            // fallback click handling using simple projected coords
            const el = e.currentTarget as HTMLDivElement;
            const rect = el.getBoundingClientRect();
            const x = (e as React.MouseEvent).clientX - rect.left;
            const y = (e as React.MouseEvent).clientY - rect.top;
            const xRatio = x / rect.width;
            const yRatio = y / rect.height;
            const deltaLat = 0.12;
            const lng = center.lng + (xRatio - 0.5) * deltaLat * (rect.width / rect.height);
            const lat = center.lat + (0.5 - yRatio) * deltaLat;
            const coords = { lat, lng };
            try { if (onPick) onPick(coords); } catch(e){}
            try { if (onPickDestination && (!pickMode || pickMode === 'destination')) onPickDestination(coords); } catch(e){};
          }}
          style={{
            background:
              "radial-gradient(ellipse at 20% 10%, rgba(16,185,129,0.10), transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(16,185,129,0.12), transparent 55%), linear-gradient(0deg, rgba(0,0,0,0.04), rgba(0,0,0,0.04)), repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 20px)",
          }}
        />
      )}

      {/* fallback svg roads for non-google */}
      {!googleKey && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 800" aria-hidden>
          <path d="M20 780 C80 600, 60 580, 100 480 C140 380, 180 360, 200 260 C220 160, 260 140, 300 60" stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M380 780 C320 660, 340 540, 280 460 C220 380, 160 340, 140 260 C120 180, 100 120, 80 60" stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" />
        </svg>
      )}

      {/* markers for fallback mode */}
      {!googleKey && (
        <div className="absolute inset-0 pointer-events-none">
          {!hidePickupMarker && <RenderMarker type="pickup" coords={pickupCoords} project={project} />}
          <RenderMarker type="destination" coords={destinationCoords} project={project} />
        </div>
      )}
    </div>
  );
}

function RenderMarker({ type, coords, project }: { type: 'pickup' | 'destination'; coords?: { lat: number; lng: number } | null; project: (c?: { lat: number; lng: number }, r?: DOMRect | null) => { left: number; top: number; visible: boolean } }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ left: number; top: number; visible: boolean }>({ left: 0, top: 0, visible: false });

  React.useEffect(() => {
    const el = ref.current?.parentElement?.parentElement as HTMLDivElement | null;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = project(coords, rect);
    setPos(p);
    const onResize = () => {
      const rect2 = el.getBoundingClientRect();
      setPos(project(coords, rect2));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [coords]);

  if (!pos.visible) return null;
  return (
    <div ref={ref} style={{ position: 'absolute', left: pos.left - 10, top: pos.top - 10 }}>
      <div className={`h-5 w-5 rounded-full ${type === 'pickup' ? 'bg-primary' : 'bg-red-500'} border-2 border-white shadow`} />
    </div>
  );
}
