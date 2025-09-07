import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  pickupCoords?: { lat: number; lng: number } | null;
  destinationCoords?: { lat: number; lng: number } | null;
  onPickDestination?: (c: { lat: number; lng: number }) => void;
}

export default function MapView({ className, pickupCoords, destinationCoords, onPickDestination }: Props) {
  // center map around pickup if available, otherwise default to Abuja
  const center = pickupCoords ?? { lat: 9.0765, lng: 7.3986 };
  const deltaLat = 0.12; // degrees latitude span

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xRatio = x / rect.width;
    const yRatio = y / rect.height;
    const lng = center.lng + (xRatio - 0.5) * deltaLat * (rect.width / rect.height);
    const lat = center.lat + (0.5 - yRatio) * deltaLat;
    const coords = { lat, lng };
    if (onPickDestination) onPickDestination(coords);
  };

  const project = (coords?: { lat: number; lng: number } | null, rect?: DOMRect | null) => {
    if (!coords || !rect) return { left: 0, top: 0, visible: false };
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
      onClick={handleClick}
    >
      {/* Abstract map background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, rgba(16,185,129,0.10), transparent 50%), radial-gradient(ellipse at 80% 30%, rgba(16,185,129,0.12), transparent 55%), linear-gradient(0deg, rgba(0,0,0,0.04), rgba(0,0,0,0.04)), repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 20px)",
        }}
      />
      {/* Road strokes */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 800" aria-hidden>
        <path d="M20 780 C80 600, 60 580, 100 480 C140 380, 180 360, 200 260 C220 160, 260 140, 300 60" stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M380 780 C320 660, 340 540, 280 460 C220 380, 160 340, 140 260 C120 180, 100 120, 80 60" stroke="rgba(0,0,0,0.2)" strokeWidth="8" fill="none" strokeLinecap="round" />
      </svg>
      {/* markers */}
      <div className="absolute inset-0 pointer-events-none">
        <RenderMarker type="pickup" coords={pickupCoords} project={project} />
        <RenderMarker type="destination" coords={destinationCoords} project={project} />
      </div>
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
