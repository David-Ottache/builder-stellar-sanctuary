import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { safeFetch, haversineKm } from "@/lib/utils";
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
              // determine fee using pending trip coords and vehicle type
            const rates: Record<string, number> = { go: 100, comfort: 400, xl: 600 };
            const vehicleId = (pendingTrip?.vehicle as string) || 'go';
            let distance = 0;
            if (pendingTrip?.pickupCoords && pendingTrip?.destinationCoords) {
              try { distance = haversineKm(pendingTrip.pickupCoords, pendingTrip.destinationCoords); } catch (e) { distance = 0; }
            }
            const rate = rates[vehicleId] ?? 100;
            // ensure minimum fee of 1 to avoid server-side 'amount must be positive' errors
            const rawFee = Math.round(rate * distance);
            const fee = Math.max(1, rawFee);

            if (!selectedDriverId) selectDriver(user.id);

            if (method === 'wallet') {
              if (!appUser) {
                await Swal.fire({ icon: 'error', title: 'Not signed in', text: 'Please sign in to use wallet payments.' });
                return;
              }

              const wallet = Number(appUser.walletBalance ?? (appUser.wallet && (appUser.wallet as any).balance) ?? (appUser as any).balance ?? 0);
              if (wallet >= fee) {
                const newBalance = wallet - fee;
                // fetch latest balance from server to avoid stale client state
                try {
                  const uRes = await safeFetch(`/api/users/${appUser.id}`);
                  const uData = uRes && uRes.ok ? await uRes.json().catch(()=>null) : null;
                  const serverBal = Number(uData?.user?.walletBalance ?? appUser.walletBalance ?? 0);
                  if (serverBal < fee) {
                    const result = await Swal.fire({
                      icon: 'error',
                      title: 'Insufficient funds',
                      html: `Your current wallet balance is ₦${serverBal.toLocaleString()}. The trip requires ₦${fee.toLocaleString()}. Would you like to top up?`,
                      showCancelButton: true,
                      confirmButtonText: 'Top Up',
                    });
                    if (result.isConfirmed) navigate('/wallet');
                    return;
                  }
                } catch (e) {
                  console.warn('failed fetching latest balance', e);
                  await Swal.fire({ icon: 'warning', title: 'Could not verify balance', text: 'Proceeding to attempt deduction with current balance.' });
                }

                // persist deduction to server
                try {
                  const res = await fetch('/api/wallet/deduct', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: appUser.id, amount: fee }) });
                  if (!res.ok) {
                    const d = await res.json().catch(()=>({}));
                    if (d.error === 'insufficient_funds') {
                      await Swal.fire({ icon: 'error', title: 'Insufficient funds', text: 'Your wallet has insufficient funds. Please top up or choose another payment method.' });
                    } else {
                      await Swal.fire({ icon: 'error', title: 'Payment failed', text: d.error || 'Could not deduct from wallet' });
                    }
                    return;
                  }
                } catch (e) {
                  console.warn('wallet deduct failed', e);
                  await Swal.fire({ icon: 'error', title: 'Payment failed', text: 'Could not reach server' });
                  return;
                }

                // update app store user (persists to sessionStorage)
                try { setAppUser({ ...appUser, walletBalance: newBalance }); } catch (e) { console.warn('Failed updating wallet in store', e); }

                // start the trip with computed fee
                startTrip({ pickup: pendingTrip?.pickup ?? 'Current location', destination: pendingTrip?.destination ?? 'TBD', driverId: user.id, fee });
                navigate('/');
              } else {
                await Swal.fire({ icon: 'error', title: 'Insufficient funds', text: 'You have insufficient funds in your wallet. Please top up or choose another payment method.' });
              }
            } else {
              // card payment - proceed without wallet deduction
              startTrip({ pickup: pendingTrip?.pickup ?? 'Current location', destination: pendingTrip?.destination ?? 'TBD', driverId: user.id, fee });
              navigate('/');
            }
          }}>Request</Button>
        </div>
      </div>
    </Layout>
  );
}
