import { cn } from "@/lib/utils";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export default function Layout({ children, className }: Props) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(120deg,hsl(152_60%_96%),white_40%,white)]">
      <div className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden">
        <TopBar className="bg-gradient-to-b from-white/90 to-transparent backdrop-blur" />
        <main className={cn("pt-14 pb-24", className)}>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
