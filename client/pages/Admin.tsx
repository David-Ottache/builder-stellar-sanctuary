import Layout from "@/components/app/Layout";
import { useEffect, useState } from "react";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      try {
        const [u,d,t] = await Promise.all([
          fetch('/api/admin/users').then(r=>r.ok?r.json():{users:[]}).catch(()=>({users:[]})),
          fetch('/api/admin/drivers').then(r=>r.ok?r.json():{drivers:[]}).catch(()=>({drivers:[]})),
          fetch('/api/admin/trips').then(r=>r.ok?r.json():{trips:[]}).catch(()=>({trips:[]})),
        ]);
        setUsers(u.users||[]);
        setDrivers(d.drivers||[]);
        setTrips(t.trips||[]);
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {loading && <div className="mt-2 text-sm text-neutral-600">Loading...</div>}
        {!loading && (
          <div className="space-y-6 mt-4">
            <section>
              <h2 className="text-lg font-semibold">Users ({users.length})</h2>
              <div className="mt-2 overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead><tr className="bg-neutral-50"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Email</th></tr></thead>
                  <tbody>
                    {users.map((u:any)=> (
                      <tr key={u.id} className="border-t"><td className="p-2">{`${u.firstName||''} ${u.lastName||''}`.trim() || u.name || u.id}</td><td className="p-2">{u.phone||'-'}</td><td className="p-2">{u.email||'-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold">Drivers ({drivers.length})</h2>
              <div className="mt-2 overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead><tr className="bg-neutral-50"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Rating</th><th className="p-2 text-left">Rides</th></tr></thead>
                  <tbody>
                    {drivers.map((d:any)=> (
                      <tr key={d.id} className="border-t"><td className="p-2">{`${d.firstName||''} ${d.lastName||''}`.trim() || d.name || d.id}</td><td className="p-2">{d.phone||'-'}</td><td className="p-2">{typeof d.rating==='number'? d.rating: '-'}</td><td className="p-2">{typeof d.rides==='number'? d.rides: '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h2 className="text-lg font-semibold">Trips ({trips.length})</h2>
              <div className="mt-2 overflow-x-auto rounded-xl border bg-white">
                <table className="min-w-full text-sm">
                  <thead><tr className="bg-neutral-50"><th className="p-2 text-left">ID</th><th className="p-2 text-left">Pickup</th><th className="p-2 text-left">Destination</th><th className="p-2 text-left">Cost (₦)</th><th className="p-2 text-left">Driver</th><th className="p-2 text-left">User</th><th className="p-2 text-left">Status</th></tr></thead>
                  <tbody>
                    {trips.map((t:any)=> (
                      <tr key={t.id} className="border-t"><td className="p-2">{t.id}</td><td className="p-2">{t.pickup}</td><td className="p-2">{t.destination}</td><td className="p-2">{Number(t.fee||0).toLocaleString()}</td><td className="p-2">{t.driverId||'-'}</td><td className="p-2">{t.userId||'-'}</td><td className="p-2">{t.status||'-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}
