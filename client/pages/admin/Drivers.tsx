import React, { useEffect, useMemo, useState } from 'react';

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(()=>{
    (async()=>{
      try {
        const [d,t] = await Promise.all([
          fetch('/api/admin/drivers').then(r=>r.ok?r.json():{drivers:[]}).catch(()=>({drivers:[]})),
          fetch('/api/admin/trips').then(r=>r.ok?r.json():{trips:[]}).catch(()=>({trips:[]})),
        ]);
        setDrivers(d.drivers||[]); setTrips(t.trips||[]);
      } finally { setLoading(false); }
    })();
  },[]);

  const tripsByDriver = useMemo(()=>countBy(trips,'driverId'),[trips]);
  const ratingBuckets = useMemo(()=>{
    const buckets: Record<string, number> = { '5★':0,'4★':0,'3★':0,'2★':0,'1★':0 };
    drivers.forEach((d:any)=>{ const r=Math.round(Number(d.rating||0)); const key = `${Math.min(5,Math.max(1,r))}★`; buckets[key] = (buckets[key]||0)+1; });
    return Object.entries(buckets).map(([label,value])=>({label,value}));
  },[drivers]);

  const nameById = useMemo(()=>{ const m:Record<string,string>={}; drivers.forEach((d:any)=>{ const id=String(d.id||d.uid||d.email||d.phone||''); const nm=((`${d.firstName||''} ${d.lastName||''}`).trim())||d.name||id; if(id) m[id]=nm; }); return m; },[drivers]);
  const topDrivers = useMemo(()=> Object.entries(tripsByDriver).map(([k,v])=>({label:nameById[String(k)]||String(k),value:v as number})).sort((a,b)=>b.value-a.value).slice(0,5),[tripsByDriver,nameById]);
  const filtered = useMemo(()=>{
    const query = q.trim().toLowerCase();
    if (!query) return drivers;
    return drivers.filter((d:any)=>{
      const name = ((`${d.firstName||''} ${d.lastName||''}`).trim()) || d.name || '';
      return [name, d.email, d.phone].some(v=> String(v||'').toLowerCase().includes(query));
    });
  },[drivers,q]);

  return (
    <div>
      <div className="mb-4 text-xl font-bold">Drivers</div>
      {loading ? (<div className="text-sm text-neutral-600">Loading…</div>) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-neutral-600">
              <span>All drivers</span>
              <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search drivers" className="h-9 w-56 rounded-lg border px-3 text-xs font-normal outline-none" />
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-neutral-50"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Phone</th><th className="p-2 text-left">Rating</th><th className="p-2 text-left">Rides</th><th className="p-2 text-left">Trips</th></tr></thead>
                <tbody>
                  {filtered.map((d:any)=>{
                    const id = d.id || d.uid || d.email || d.phone;
                    const name = (`${d.firstName||''} ${d.lastName||''}`.trim()) || d.name || id;
                    const tripsCount = tripsByDriver[id] || 0;
                    return (
                      <tr key={id} className="border-t">
                        <td className="p-2">{name}</td>
                        <td className="p-2">{d.phone||'—'}</td>
                        <td className="p-2">{typeof d.rating==='number'? d.rating:'—'}</td>
                        <td className="p-2">{typeof d.rides==='number'? d.rides:'—'}</td>
                        <td className="p-2">{tripsCount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-neutral-600">Top drivers by trips</div>
              <BarChart data={topDrivers} />
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="mb-2 text-sm font-semibold text-neutral-600">Ratings distribution</div>
              <BarChart data={ratingBuckets} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function countBy(rows:any[], key:string){ const m:Record<string,number>={}; rows.forEach(r=>{ const k=String(r[key]||'—'); m[k]=(m[k]||0)+1;}); return m; }
function short(v:string){ return v?.slice(0,6) || '—'; }
function BarChart({ data, labelFormatter }:{ data:{label:string; value:number}[]; labelFormatter?:(s:string)=>string }){
  const max=Math.max(1,...data.map(d=>d.value));
  return (
    <div className="space-y-2">
      {data.map((d)=> (
        <div key={d.label} className="flex items-center gap-2">
          <div className="w-24 text-xs text-neutral-600">{labelFormatter?labelFormatter(d.label):d.label}</div>
          <div className="h-2 flex-1 rounded bg-neutral-200">
            <div className="h-2 rounded bg-primary" style={{ width: `${(d.value/max)*100}%` }} />
          </div>
          <div className="w-10 text-right text-xs">{d.value}</div>
        </div>
      ))}
    </div>
  );
}
