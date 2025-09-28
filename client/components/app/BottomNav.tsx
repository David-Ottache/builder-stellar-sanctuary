import { cn } from "@/lib/utils";
import { Home, Clock, Wallet, User, Scan } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import Swal from 'sweetalert2';

interface Props {
  className?: string;
}

function getItems(user: any) {
  if (user && user.role === 'driver') {
    const home = user.id ? `/driver/${encodeURIComponent(String(user.id))}` : '/driver/me';
    return [
      { to: home, label: "Home", Icon: Home },
      { to: "/driver/trips", label: "Trips", Icon: Clock },
      // hide Verify for drivers
      { to: "/driver/wallet", label: "Wallet", Icon: Wallet },
      { to: "/driver/profile", label: "Profile", Icon: User },
    ];
  }
  return [
    { to: "/", label: "Home", Icon: Home },
    { to: "/trips", label: "Trips", Icon: Clock },
    { to: "/user/verify", label: "Verify", Icon: Scan },
    { to: "/wallet", label: "Wallet", Icon: Wallet },
    { to: "/profile", label: "Profile", Icon: User },
  ];
}

export default function BottomNav({ className }: Props) {
  const location = useLocation();
  const { trip, endTrip, user } = useAppStore();
  const itemsToRender = items.filter(i => !(user && user.role === 'driver' && i.to === '/user/verify'));
  return (
    <nav
      className={cn(
        "mx-auto flex h-16 w-full max-w-md items-center justify-between gap-1 rounded-2xl border bg-white/90 px-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:bg-black/50",
        "fixed bottom-3 left-1/2 -translate-x-1/2 z-30",
        className,
      )}
      aria-label="Primary"
    >
      {itemsToRender.map(({ to, label, Icon }) => {
        const active = location.pathname === to;
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium",
              active
                ? "text-primary"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            <Icon className={cn("h-5 w-5", active && "fill-primary/10")}/>
            {label}
          </NavLink>
        );
      })}
      {trip && (
        <button
          onClick={async () => {
            try {
              const { isConfirmed, value } = await Swal.fire({
                title: 'Enter trip price (₦)',
                input: 'number',
                inputLabel: 'Price',
                inputValue: '0',
                inputAttributes: { min: '0', step: '1' },
                showCancelButton: true,
                confirmButtonText: 'End Trip',
              }) as any;
              if (!isConfirmed) return;
              const n = Math.round(Number(value));
              if (!Number.isFinite(n) || n < 0) { await Swal.fire('Invalid amount', 'Please enter a valid non-negative number', 'warning'); return; }
              endTrip(n);
            } catch (e) { console.warn('failed ending trip from nav', e); }
          }}
          className="absolute -top-10 right-4 rounded-full bg-red-600 text-white px-3 py-2 text-sm"
        >End Trip</button>
      )}
    </nav>
  );
}
