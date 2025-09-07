import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { safeFetch } from "@/lib/utils";
import Swal from 'sweetalert2';

export default function UserDetails() {
  const { id } = useParams();
  const { startTrip, selectedDriverId, selectDriver, drivers, pendingTrip, user: appUser, setUser: setAppUser } = useAppStore();
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
      const candidates = [
        `/api/users/${id}`,
        `${origin}/api/users/${id}`,
        `/api/drivers/${id}`,
        `${origin}/api/drivers/${id}`,
        `/.netlify/functions/api/users/${id}`,
        `${origin}/.netlify/functions/api/users/${id}`,
        `/.netlify/functions/api/drivers/${id}`,
        `${origin}/.netlify/functions/api/drivers/${id}`,
      ];

      try {
        let found = null as any;
        for (const url of candidates) {
          try {
            console.debug('Attempting fetch', url);
            const res = await safeFetch(url);
            if (!res || !res.ok) continue;
            const data = await res.json().catch(()=>null);
            if (!data) continue;
            found = data.user ?? data.driver ?? null;
            if (found) {
              setUser(found);
              break;
            }
          } catch (inner) {
            console.warn('fetch candidate failed', url, inner);
            continue;
          }
        }
        if (!found) {
          console.warn('No user/driver found at any candidate URL');
          setUser(null);
        }
      } catch (e) {
        console.error('Failed fetching user (outer)', e);
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
          <Button className="h-12 flex-1 rounded-full" onClick={async () => {
            // determine fee from driver data
            const driverPrice = Number(user.price ?? (drivers.find((d:any)=>d.id===user.id)?.price) ?? 0);
            const fee = driverPrice;

            if (!selectedDriverId) selectDriver(user.id);

            if (method === 'wallet') {
              if (!appUser) {
                await Swal.fire({ icon: 'error', title: 'Not signed in', text: 'Please sign in to use wallet payments.' });
                return;
              }

              const wallet = Number(appUser.walletBalance ?? appUser.wallet ?? appUser.balance ?? 0);
              if (wallet >= fee) {
                const newBalance = wallet - fee;
                // update app store user (persists to sessionStorage)
                try { setAppUser({ ...appUser, walletBalance: newBalance }); } catch (e) { console.warn('Failed updating wallet in store', e); }

                // start the trip with computed fee
                startTrip({ pickup: pendingTrip?.pickup ?? 'Current location', destination: pendingTrip?.destination ?? 'TBD', driverId: user.id, fee });
                navigate('/trip/summary');
              } else {
                await Swal.fire({ icon: 'error', title: 'Insufficient funds', text: 'You have insufficient funds in your wallet. Please top up or choose another payment method.' });
              }
            } else {
              // card payment - proceed without wallet deduction
              startTrip({ pickup: pendingTrip?.pickup ?? 'Current location', destination: pendingTrip?.destination ?? 'TBD', driverId: user.id, fee });
              navigate('/trip/summary');
            }
          }}>Request</Button>
        </div>
      </div>
    </Layout>
  );
}
