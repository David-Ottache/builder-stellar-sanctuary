import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import Swal from 'sweetalert2';

export default function Wallet() {
  const { user: appUser, setUser } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    (async ()=>{
      if (!appUser) return;
      try {
        const res = await fetch(`/api/wallet/transactions/${appUser.id}`);
        if (!res.ok) return;
        const data = await res.json().catch(()=>null);
        if (data?.transactions) setTransactions(data.transactions);
      } catch(e){ console.warn('failed fetching tx', e); }
    })();
  }, [appUser]);

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
      if (txRes.ok) { const dd = await txRes.json().catch(()=>null); if (dd?.transactions) setTransactions(dd.transactions); }
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
      if (txRes.ok) { const dd = await txRes.json().catch(()=>null); if (dd?.transactions) setTransactions(dd.transactions); }
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
          <div className="mt-1 text-3xl font-extrabold">₦{(appUser?.walletBalance ?? 0).toLocaleString()}.00</div>
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
          {transactions.map((t)=> (
            <div key={t.id} className="flex items-center gap-3 rounded-xl p-2">
              <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center">{t.type === 'topup' ? 'T' : t.from ? 'D' : 'C'}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.type === 'topup' ? 'Top Up' : t.from ? `From ${t.from}` : `To ${t.to}`}</div>
                <div className="text-xs text-neutral-600">{new Date(t.ts).toLocaleString()}</div>
              </div>
              <div className={t.to === appUser?.id ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {(t.to === appUser?.id ? '+' : '-') }₦{(t.amount || 0).toLocaleString()}.00
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
