import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { safeFetch } from '@/lib/utils';

export default function Wallet() {
  const { user: appUser, setUser } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [displayBalance, setDisplayBalance] = useState<number>(appUser?.walletBalance ?? 0);
  const [namesMap, setNamesMap] = useState<Record<string,{ name: string; avatar?: string }>>({});

  useEffect(()=>{
    (async ()=>{
      if (!appUser) return;
      try {
        // If driver, fetch driver document to get driver wallet balance
        if (appUser.role === 'driver') {
          try {
            const r = await safeFetch(`/api/drivers/${appUser.id}`);
            if (r && r.ok) {
              const d = await r.json().catch(()=>null);
              const bal = Number(d?.driver?.walletBalance ?? d?.driver?.balance ?? d?.driver?.wallet ?? 0);
              setDisplayBalance(bal);
            }
          } catch(e) { console.warn('failed fetching driver data', e); }
        } else {
          setDisplayBalance(Number(appUser.walletBalance ?? (appUser.wallet && (appUser.wallet as any).balance) ?? (appUser as any).balance ?? 0));
        }

        const res = await safeFetch(`/api/wallet/transactions/${appUser.id}`);
        if (!res || !res.ok) return;
        const data = await res.json().catch(()=>null);
        if (data?.transactions) {
          // annotate transactions with a participantId (from or to) to simplify UI
          const annotated = (data.transactions || []).map((t:any) => ({ ...t, participantId: t.from || t.to || null }));
          setTransactions(annotated);
          // prefetch participant names for transactions
          const ids = new Set<string>();
          for (const t of annotated) {
            if (t.participantId) ids.add(t.participantId);
          }
          const missing = Array.from(ids).filter(id => id && !namesMap[id]);
          if (missing.length) {
            const mapUpdates: Record<string,{ name: string; avatar?: string }> = {};
            await Promise.all(missing.map(async (id)=>{
              // if id looks like 'trip:<tripId>' skip — we'll handle per-transaction below
              try {
                // try user endpoint
                const r1 = await safeFetch(`/api/users/${encodeURIComponent(id)}`);
                if (r1 && r1.ok) {
                  const dd = await r1.json().catch(()=>null);
                  if (dd && (dd.user || dd.firstName || dd.name)) {
                    const user = dd.user || dd;
                    const name = user ? `${user.firstName||''} ${user.lastName||''}`.trim() : (dd.firstName || dd.name || id);
                    const avatar = (user && (user.profilePhoto || user.avatar || user.photoUrl)) || undefined;
                    mapUpdates[id] = { name: name || id, avatar };
                    return;
                  }
                }
              } catch(e){}
              try {
                const r2 = await safeFetch(`/api/drivers/${encodeURIComponent(id)}`);
                if (r2 && r2.ok) {
                  const dd = await r2.json().catch(()=>null);
                  if (dd && dd.driver) {
                    const driver = dd.driver;
                    const name = `${driver.firstName||''} ${driver.lastName||''}`.trim() || driver.name || id;
                    const avatar = driver.avatar || driver.profilePhoto || undefined;
                    mapUpdates[id] = { name: name || id, avatar };
                    return;
                  }
                }
              } catch(e){}
              // fallback to id
              mapUpdates[id] = { name: id, avatar: undefined };
            }));
            setNamesMap((prev)=> ({ ...prev, ...mapUpdates }));
          }

          // For trip payouts without 'from', try to resolve passenger by tripId
          for (const t of annotated) {
            if (!t.participantId && t.tripId) {
              try {
                const r = await safeFetch(`/api/trip/${encodeURIComponent(t.tripId)}`);
                if (r && r.ok) {
                  const td = await r.json().catch(()=>null);
                  const trip = td?.trip;
                  if (trip) {
                    const uid = trip.userId as string || trip.driverId as string || null;
                    if (uid) {
                      // set namesMap for uid if missing
                      if (!namesMap[uid]) {
                        try {
                          const ru = await safeFetch(`/api/users/${encodeURIComponent(uid)}`);
                          if (ru && ru.ok) {
                            const ud = await ru.json().catch(()=>null);
                            const user = ud?.user || ud;
                            const name = user ? `${user.firstName||''} ${user.lastName||''}`.trim() : (ud.firstName || ud.name || uid);
                            const avatar = (user && (user.profilePhoto || user.avatar || user.photoUrl)) || undefined;
                            setNamesMap(prev => ({ ...prev, [uid]: { name: name || uid, avatar } }));
                          } else {
                            // try drivers
                            const rd = await safeFetch(`/api/drivers/${encodeURIComponent(uid)}`);
                            if (rd && rd.ok) {
                              const dd = await rd.json().catch(()=>null);
                              const driver = dd?.driver;
                              const name = driver ? `${driver.firstName||''} ${driver.lastName||''}`.trim() : uid;
                              const avatar = driver ? (driver.avatar || driver.profilePhoto) : undefined;
                              setNamesMap(prev => ({ ...prev, [uid]: { name: name || uid, avatar } }));
                            }
                          }
                        } catch(e){}
                      }
                      // annotate transaction participantId
                      setTransactions(prev => prev.map(pt => pt.id === t.id ? { ...pt, participantId: uid } : pt));
                    }
                  }
                }
              } catch(e){}
            }
          }
        }
      } catch(e){ console.warn('failed fetching tx', e); }
    })();
  }, [appUser]);

  useEffect(()=>{
    (async ()=>{
      if (!transactions || !transactions.length) return;
      const ids = new Set<string>();
      for (const t of transactions) {
        if (t.participantId) ids.add(t.participantId);
      }
      const missing = Array.from(ids).filter(id => id && !namesMap[id]);
      if (!missing.length) return;
      const mapUpdates: Record<string,{ name: string; avatar?: string }> = {};
      await Promise.all(missing.map(async (id)=>{
        try {
          const r1 = await safeFetch(`/api/users/${encodeURIComponent(id)}`);
      if (r1 && r1.ok) {
        const dd = await r1.json().catch(()=>null);
        if (dd && (dd.user || dd.firstName || dd.name)) {
          const user = dd.user || dd;
          const name = user ? `${user.firstName||''} ${user.lastName||''}`.trim() : (dd.firstName || dd.name || id);
          const avatar = (user && (user.profilePhoto || user.avatar || user.photoUrl)) || undefined;
          mapUpdates[id] = { name: name || id, avatar };
          return;
        }
      }
        } catch(e){}
        try {
          const r2 = await safeFetch(`/api/drivers/${encodeURIComponent(id)}`);
      if (r2 && r2.ok) {
        const dd = await r2.json().catch(()=>null);
        if (dd && dd.driver) {
          const driver = dd.driver;
          const name = `${driver.firstName||''} ${driver.lastName||''}`.trim() || driver.name || id;
          const avatar = driver.avatar || driver.profilePhoto || undefined;
          mapUpdates[id] = { name: name || id, avatar };
          return;
        }
      }
        } catch(e){}
        mapUpdates[id] = { name: id, avatar: undefined };
      }));
      setNamesMap((prev)=> ({ ...prev, ...mapUpdates }));
    })();
  }, [transactions]);

  const doSend = async () => {
    if (!appUser) return Swal.fire('Not signed in');
    const { value: formValues } = await Swal.fire({
      title: 'Send funds',
      html:
        '<input id="swal-to" class="swal2-input" placeholder="Recipient user id" />' +
        '<input id="swal-amount" class="swal2-input" placeholder="Amount (N)" />',
      focusConfirm: false,
      preConfirm: () => {
        const to = (document.getElementById('swal-to') as HTMLInputElement).value;
        const amount = (document.getElementById('swal-amount') as HTMLInputElement).value;
        return { to, amount };
      }
    }) as any;
    if (!formValues) return;
    const toId = formValues.to?.trim();
    const amount = Number(formValues.amount);
    if (!toId || !amount || amount <= 0) return Swal.fire('Invalid input');
    try {
      setLoading(true);
      const res = await fetch('/api/wallet/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: appUser.id, toId, amount }) });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        if (d.error === 'insufficient_funds') return Swal.fire('Insufficient funds');
        return Swal.fire('Transfer failed', d.error || '');
      }
      // optimistic update
      try { setUser({ ...appUser, walletBalance: Number(appUser.walletBalance ?? 0) - amount }); } catch {}
      Swal.fire('Success', 'Transfer completed');
      // refresh transactions
      const txRes = await fetch(`/api/wallet/transactions/${appUser.id}`);
      if (txRes.ok) {
        const dd = await txRes.json().catch(()=>null);
        if (dd?.transactions) {
          const annotated = (dd.transactions || []).map((t:any) => ({ ...t, participantId: t.from || t.to || null }));
          setTransactions(annotated);
        }
      }
    } catch (e) {
      console.error('send error', e);
      Swal.fire('Error', 'Transfer failed');
    } finally { setLoading(false); }
  };

  const doRequest = async () => {
    if (!appUser) return Swal.fire('Not signed in');
    const { value: formValues } = await Swal.fire({
      title: 'Request funds',
      html:
        '<input id="swal-to" class="swal2-input" placeholder="User id to request from" />' +
        '<input id="swal-amount" class="swal2-input" placeholder="Amount (N)" />' +
        '<input id="swal-note" class="swal2-input" placeholder="Note (optional)" />',
      focusConfirm: false,
      preConfirm: () => {
        const to = (document.getElementById('swal-to') as HTMLInputElement).value;
        const amount = (document.getElementById('swal-amount') as HTMLInputElement).value;
        const note = (document.getElementById('swal-note') as HTMLInputElement).value;
        return { to, amount, note };
      }
    }) as any;
    if (!formValues) return;
    const toId = formValues.to?.trim();
    const amount = Number(formValues.amount);
    const note = formValues.note;
    if (!toId || !amount || amount <= 0) return Swal.fire('Invalid input');
    try {
      setLoading(true);
      const res = await fetch('/api/wallet/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromId: appUser.id, toId, amount, note }) });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        return Swal.fire('Request failed', d.error || '');
      }
      Swal.fire('Success', 'Request created');
    } catch (e) {
      console.error('request error', e);
      Swal.fire('Error', 'Request failed');
    } finally { setLoading(false); }
  };

  const doTopUp = async () => {
    if (!appUser) return Swal.fire('Not signed in');
    const { value: amountStr } = await Swal.fire({ title: 'Top up', input: 'number', inputLabel: 'Amount (N)', inputAttributes: { min: '1' } }) as any;
    const amount = Number(amountStr);
    if (!amount || amount <= 0) return;
    try {
      setLoading(true);
      const res = await fetch('/api/wallet/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: appUser.id, amount }) });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        return Swal.fire('Top up failed', d.error || '');
      }
      // optimistic update: add amount
      try { setUser({ ...appUser, walletBalance: Number(appUser.walletBalance ?? 0) + amount }); } catch {}
      Swal.fire('Top up initiated', 'Top up queued (simulate bank integration)');
      // refresh transactions
      const txRes = await fetch(`/api/wallet/transactions/${appUser.id}`);
      if (txRes.ok) {
        const dd = await txRes.json().catch(()=>null);
        if (dd?.transactions) {
          const annotated = (dd.transactions || []).map((t:any) => ({ ...t, participantId: t.from || t.to || null }));
          setTransactions(annotated);
        }
      }
    } catch (e) {
      console.error('topup error', e);
      Swal.fire('Error', 'Top up failed');
    } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-neutral-600">My Balance</div>
          <div className="mt-1 text-3xl font-extrabold">₦{(displayBalance ?? 0).toLocaleString()}.00</div>
          <div className="mt-4 flex gap-3">
            <Button className="h-10 flex-1 rounded-full" onClick={doSend} disabled={loading}>Send</Button>
            <Button variant="secondary" className="h-10 flex-1 rounded-full" onClick={doRequest} disabled={loading}>Request</Button>
          </div>
          <div className="mt-2">
            <Button variant="outline" className="h-10 w-full rounded-full" onClick={doTopUp} disabled={loading}>Top Up</Button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-2">
          {transactions.length === 0 && <div className="p-4 text-sm text-neutral-500">No recent transactions</div>}
          {transactions.map((t)=> {
            const isTopUp = t.type === 'topup';
            const isIncoming = t.to === appUser?.id;
            const isOutgoing = t.from === appUser?.id;
            let title = '';
            if (isTopUp) title = 'Top Up';
            else if (t.type === 'deduct') title = 'Payment';
            else if (t.from && t.to) title = `Transfer (${(namesMap[t.from] && namesMap[t.from].name) || t.from} → ${(namesMap[t.to] && namesMap[t.to].name) || t.to})`;
            else if (t.participantId && isIncoming) title = `From ${(namesMap[t.participantId] && namesMap[t.participantId].name) || t.participantId || ''}`;
            else if (t.participantId && isOutgoing) title = `To ${(namesMap[t.participantId] && namesMap[t.participantId].name) || t.participantId || ''}`;
            else title = t.type || 'Transaction';
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl p-2">
                <div className="h-9 w-9 rounded-full bg-neutral-100 overflow-hidden flex items-center justify-center">
                {isTopUp ? (
                  <div className="text-sm font-semibold">T</div>
                ) : (
                  (() => {
                    const idToShow = t.participantId || (isIncoming ? t.from : isOutgoing ? t.to : (t.from || t.to));
                    const p = idToShow ? namesMap[idToShow] : undefined;
                    if (p && p.avatar) return <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />;
                    const initials = p && p.name ? p.name.split(' ').map(s=>s[0]).join('').substring(0,2).toUpperCase() : (idToShow ? String(idToShow).substring(0,2).toUpperCase() : '?');
                    return <div className="text-sm font-semibold">{initials}</div>;
                  })()
                )}
              </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{title}</div>
                  {(!(t.from && t.to) && !(t.type === 'topup')) && (
                    <div className="text-xs text-neutral-600">{t.participantId ? (namesMap[t.participantId]?.name || '') : ''}</div>
                  )}
                  <div className="text-xs text-neutral-600">{t.tripId ? `Trip ${t.tripId} • ` : ''}{new Date(t.ts).toLocaleString()}</div>
                </div>
                <div className={isIncoming ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                  {(isIncoming ? '+' : '-') }₦{(t.amount || 0).toLocaleString()}.00
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
