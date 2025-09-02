import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface Props {
  className?: string;
}

export default function TopBar({ className }: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none sticky top-0 z-30 flex h-14 items-center justify-between px-4",
        className,
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Zap className="h-5 w-5" />
        </div>
        <span className="text-lg font-extrabold tracking-tight">VoltGo</span>
      </div>
      <div className="pointer-events-auto flex items-center gap-3 text-sm">
        <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-primary/30">
          <img
            src="https://i.pravatar.cc/80?img=15"
            alt="Profile"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
