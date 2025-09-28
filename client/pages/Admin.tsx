import Layout from "@/components/app/Layout";
import { NavLink, Outlet, useLocation } from "react-router-dom";

export default function Admin() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/admin", label: "Dashboard", exact: true },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/drivers", label: "Drivers" },
    { to: "/admin/trips", label: "Trips" },
  ];
  return (
    <Layout>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r bg-white/80 p-4 md:block">
          <div className="text-lg font-extrabold tracking-tight">Admin</div>
          <nav className="mt-4 space-y-1">
            {tabs.map(t => (
              <NavLink key={t.to} to={t.to} end={t.exact as any} className={({ isActive }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-primary/10 text-primary' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-h-[calc(100vh-3.5rem)] flex-1 px-4 pt-6">
          <Outlet />
        </main>
      </div>
    </Layout>
  );
}
