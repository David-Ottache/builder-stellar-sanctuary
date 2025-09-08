import React from 'react';
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  pickupCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  onPickDestination?: (c: { lat: number; lng: number }) => void;
}

export default function MapView({ className, pickupCoords, destinationCoords, onPickDestination }: Props) {
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
          if (onPickDestination) onPickDestination({ lat, lng });
        });
      } catch (e) {
        console.warn('Failed loading Google Maps', e);
      }
    })();

    return () => { mounted = false; };
  }, [googleKey]);

  // synchronize markers from pickup/destination when not using google maps
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
            if (onPickDestination) onPickDestination(coords);
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
          <RenderMarker type="pickup" coords={pickupCoords} project={project} />
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
