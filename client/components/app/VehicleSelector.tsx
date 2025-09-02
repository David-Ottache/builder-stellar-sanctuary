import { cn } from "@/lib/utils";

export type VehicleId = "go" | "comfort" | "xl";

const CATEGORIES: { id: VehicleId; name: string; eta: string; base: number }[] = [
  { id: "go", name: "Go", eta: "3 min", base: 5.4 },
  { id: "comfort", name: "Comfort", eta: "5 min", base: 8.9 },
  { id: "xl", name: "XL", eta: "6 min", base: 12.5 },
];

interface Props {
  selected: VehicleId;
  onSelect: (id: VehicleId) => void;
}

export default function VehicleSelector({ selected, onSelect }: Props) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 pt-1">
      {CATEGORIES.map((c) => {
        const active = selected === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "min-w-[140px] flex-1 rounded-2xl border p-3 text-left shadow-sm",
              active
                ? "border-primary bg-primary/5"
                : "border-neutral-200 bg-white hover:bg-neutral-50",
            )}
          >
            <div className="flex items-center justify-between text-sm">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-neutral-500">{c.eta}</div>
            </div>
            <div className="mt-2 flex items-end justify-between">
              <div className="text-2xl font-bold">${c.base.toFixed(2)}</div>
              <div className="h-10 w-14 rounded bg-gradient-to-br from-primary/20 to-primary/40" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
