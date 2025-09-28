import React, { useEffect, useMemo, useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(()=>{
    (async()=>{
      try {
        const [u,t] = await Promise.all([
          fetch('/api/admin/users').then(r=>r.ok?r.json():{users:[]}).catch(()=>({users:[]})),
          fetch('/api/admin/trips').then(r=>r.ok?r.json():{trips:[]}).catch(()=>({trips:[]})),
        ]);
        setUsers(u.users||[]); setTrips(t.trips||[]);
      } finally { setLoading(false); }
    })();
  },[]);

  const tripsByUser = useMemo(()=>countBy(trips,'userId'),[trips]);
  const spendByUser = useMemo(()=>sumBy(trips,'userId','fee'),[trips]);
  const nameById = useMemo(()=>{ const m:Record<string,string>={}; users.forEach((u:any)=>{ const id=String(u.id||u.uid||u.email||u.phone||''); const nm=((`${u.firstName||''} ${u.lastName||''}`).trim())||u.name||id; if(id) m[id]=nm; }); return m; },[users]);
  const topUsers = useMemo(()=> Object.entries(tripsByUser).map(([k,v])=>({label:nameById[String(k)]||String(k),value:v as number})).sort((a,b)=>b.value-a.value).slice(0,5),[tripsByUser,nameById]);
  const topSpend = useMemo(()=> Object.entries(spendByUser).map(([k,v])=>({label:nameById[String(k)]||String(k),value:Number(v)})).sort((a,b)=>b.value-a.value).slice(0,5),[spendByUser,nameById]);
  const filtered = useMemo(()=>{
    const query = q.trim().toLowerCase();
    if (!query) return users;
    return users.filter((u:any)=>{
      const name = ((`${u.firstName||''} ${u.lastName||''}`).trim()) || u.name || '';
      return [name, u.email, u.phone].some(v=> String(v||'').toLowerCase().includes(query));
    });
  },[users,q]);

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Users</div>
      {loading ? (<div className="text-sm text-neutral-600">Loading…</div>) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral-600">
              <span>All users</span>
              <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search users" className="h-9 w-56 rounded-lg border px-3 text-xs font-normal outline-none" />
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-neutral-50"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Trips</th><th className="p-2 text-left">Spend (₦)</th></tr></thead>
                <tbody>
                  {filtered.map((u:any)=>{
                    const id = u.id || u.uid || u.email || u.phone;
                    const tripsCount = tripsByUser[id] || 0;
                    const spend = spendByUser[id] || 0;
                    const name = (`${u.firstName||''} ${u.lastName||''}`.trim()) || u.name || id;
                    return (
                      <tr key={id} className="border-t">
                        <td className="p-2">{name}</td>
                        <td className="p-2">{u.phone||'—'}</td>
                        <td className="p-2">{u.email||'—'}</td>
                        <td className="p-2">{tripsCount}</td>
                        <td className="p-2">{Number(spend).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 text-sm font-semibold text-neutral-600">Top users by trips</div>
            <BarChart data={topUsers} />
            <div className="mt-4 mb-2 text-sm font-semibold text-neutral-600">Top spenders</div>
            <BarChart data={topSpend} />
          </div>
        </div>
      )}
    </div>
  );
}

function countBy(rows:any[], key:string){ const m:Record<string,number>={}; rows.forEach(r=>{ const k=String(r[key]||'—'); m[k]=(m[k]||0)+1;}); return m; }
function sumBy(rows:any[], key:string, val:string){ const m:Record<string,number>={}; rows.forEach(r=>{ const k=String(r[key]||'—'); m[k]=(m[k]||0)+Number(r[val]||0);}); return m; }
function short(v:string){ return v?.slice(0,6) || '—'; }
function BarChart({ data, labelFormatter }:{ data:{label:string; value:number}[]; labelFormatter?:(s:string)=>string }){
  const max=Math.max(1,...data.map(d=>d.value));
  return (
    <div className="space-y-2">
      {data.map((d)=> (
        <div key={d.label} className="flex items-center gap-2">
          <div className="w-20 text-xs text-neutral-600">{labelFormatter?labelFormatter(d.label):d.label}</div>
          <div className="h-2 flex-1 rounded bg-neutral-200">
            <div className="h-2 rounded bg-primary" style={{ width: `${(d.value/max)*100}%` }} />
          </div>
          <div className="w-10 text-right text-xs">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
