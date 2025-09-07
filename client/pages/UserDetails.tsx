import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function UserDetails() {
  const { id } = useParams();
  const { startTrip, selectedDriverId, selectDriver, drivers, pendingTrip } = useAppStore();
  const [method, setMethod] = useState<'wallet' | 'card'>('wallet');
  const navigate = useNavigate();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      // check store first
      const storeDriver = (drivers || []).find((d:any)=>d.id === id);
      if (storeDriver) {
        setUser(storeDriver as any);
        setLoading(false);
        return;
      }

      const origin = window.location.origin;
      const primary = `${origin}/api/users/${id}`;
      const fallback = `${origin}/.netlify/functions/api/users/${id}`;
      try {
        let res = await fetch(primary).catch(()=>null);
        if (!res || !res.ok) {
          res = await fetch(fallback).catch(()=>null);
        }
        if (!res || !res.ok) {
          setUser(null);
          setLoading(false);
          return;
        }
        const data = await res.json().catch(()=>null);
        setUser(data?.user ?? data?.driver ?? null);
      } catch (e) {
        console.error('Failed fetching user', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, drivers]);

  if (loading) return (
    <Layout>
      <div className="px-4 pt-6 text-sm text-neutral-600">Loading user...</div>
    </Layout>
  );

  if (!user) return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="text-xl font-bold">User not found</div>
        <div className="mt-2 text-sm text-neutral-600">Could not find user with id {id}</div>
      </div>
    </Layout>
  );

  const displayName = (user.name && String(user.name).trim()) || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.phone || 'User';
  const avatar = (user.avatar || user.profilePhoto || user.photo || 'https://i.pravatar.cc/80');
  const rides = user.rides ?? 0;
  const rating = user.rating ?? 0;

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <img src={avatar} className="h-16 w-16 rounded-full object-cover" alt={displayName} />
          <div>
            <div className="text-xl font-bold">{displayName}</div>
            <div className="text-sm text-neutral-600">{user.email || user.phone}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Trip Details</div>
          <div className="mt-2 text-sm text-neutral-700">
            <div>Pick Up Location: {pendingTrip?.pickup ?? 'Current location'}</div>
            <div>Destination: {pendingTrip?.destination ?? 'TBD'}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Payment Method</div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center justify-between rounded-xl border p-3"><span>Wallet</span><input type="radio" name="pm-user" checked={method==='wallet'} onChange={()=>setMethod('wallet')} /></label>
            <label className="flex items-center justify-between rounded-xl border p-3"><span>Master Card</span><input type="radio" name="pm-user" checked={method==='card'} onChange={()=>setMethod('card')} /></label>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Button className="h-12 flex-1 rounded-full" onClick={() => { if(!selectedDriverId) selectDriver(user.id); startTrip({ pickup: pendingTrip?.pickup ?? 'Current location', destination: pendingTrip?.destination ?? 'TBD', driverId: user.id, fee: 0 }); navigate('/trip/summary'); }}>Request</Button>
        </div>
      </div>
    </Layout>
  );
}
