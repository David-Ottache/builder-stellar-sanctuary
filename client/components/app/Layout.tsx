import { cn } from "@/lib/utils";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  hideTopBar?: boolean;
  hideBottomNav?: boolean;
}

export default function Layout({ children, className, hideTopBar, hideBottomNav }: Props) {
  return (
    <div className="min-h-screen w-full bg-[linear-gradient(120deg,hsl(152_60%_96%),white_40%,white)]">
      <div className="relative mx-auto min-h-screen w-full max-w-md overflow-hidden">
        {!hideTopBar && (
          <TopBar className="bg-gradient-to-b from-white/90 to-transparent backdrop-blur" />
        )}
        <main className={cn(hideTopBar ? "pt-4" : "pt-14", hideBottomNav ? "pb-4" : "pb-24", className)}>{children}</main>
        {!hideBottomNav && (
          <>
            <BottomNav />
            {/* Floating SOS */}
            {/* eslint-disable-next-line react/jsx-no-useless-fragment */}
            <></>
          </>
        )}
      </div>
    </div>
  );
}
