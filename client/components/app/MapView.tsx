import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function MapView({ className }: Props) {
  return (
    <div
      className={cn(
        "relative h-[calc(100vh-3.5rem-6rem)] w-full select-none overflow-hidden rounded-none",
        className,
      )}
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
        <circle cx="210" cy="420" r="6" fill="hsl(var(--primary))" />
        <circle cx="120" cy="520" r="4" fill="rgba(0,0,0,0.35)" />
        <circle cx="320" cy="300" r="4" fill="rgba(0,0,0,0.35)" />
      </svg>
    </div>
  );
}
