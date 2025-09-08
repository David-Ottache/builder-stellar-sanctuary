import Layout from "@/components/app/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function DriverDetails() {
  const { id } = useParams();
  const { drivers, startTrip, selectedDriverId, selectDriver } = useAppStore();
  const [method, setMethod] = useState<'wallet' | 'card'>('wallet');
  const navigate = useNavigate();

  const driver = useMemo(()=> drivers.find(d=>d.id===id) || drivers[0], [drivers, id]);

  return (
    <Layout>
      <div className="px-4 pt-6">
        <div className="flex items-center gap-3">
          <img src={driver.avatar} className="h-16 w-16 rounded-full object-cover" alt={driver.name} />
          <div>
            <div className="text-xl font-bold">{driver.name}</div>
            <div className="text-sm text-neutral-600">{driver.rides} Trips Taken • {driver.rating} Rating</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Trip Details</div>
          <div className="mt-2 text-sm text-neutral-700">
            <div>Pick Up Location: Federal Housing, Kuje.</div>
            <div>Destination: Transcorp Hilton</div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="font-semibold">Payment Method</div>
          <div className="mt-3 space-y-2">
            <label className="flex items-center justify-between rounded-xl border p-3"><span>Wallet</span><input type="radio" name="pm" checked={method==='wallet'} onChange={()=>setMethod('wallet')} /></label>
            <label className="flex items-center justify-between rounded-xl border p-3"><span>Master Card</span><input type="radio" name="pm" checked={method==='card'} onChange={()=>setMethod('card')} /></label>
          </div>
          <div className="mt-3 text-right text-sm text-neutral-700">Total Amount <span className="font-bold">N{driver.price * 1000}</span></div>
        </div>
        <div className="mt-4 flex gap-3">
          <Button className="h-12 flex-1 rounded-full" onClick={()=>{ if(!selectedDriverId) selectDriver(driver.id); startTrip({ pickup: 'Federal Housing, Kuje.', destination: 'Transcorp Hilton', driverId: driver.id, fee: driver.price }); navigate('/'); }}>Pay</Button>
        </div>
        <div className="mt-4">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={async ()=>{
              if (!driver) return alert('No driver');
              const origin = window.location.origin;
              const qrData = `${origin}/user/verify?code=${encodeURIComponent(driver.id)}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}`;
              // show modal similar to registration
              const wrapper = document.createElement('div');
              wrapper.style.position = 'fixed'; wrapper.style.inset = '0'; wrapper.style.display = 'flex'; wrapper.style.alignItems = 'center'; wrapper.style.justifyContent = 'center'; wrapper.style.background = 'rgba(0,0,0,0.4)'; wrapper.style.zIndex = '9999';
              const box = document.createElement('div'); box.style.background = 'white'; box.style.padding = '20px'; box.style.borderRadius = '12px'; box.style.maxWidth = '420px'; box.style.textAlign = 'center';
              const img = document.createElement('img'); img.src = qrUrl; img.width = 320; img.height = 320; img.style.display = 'block'; img.style.margin = '0 auto 12px';
              const title = document.createElement('div'); title.textContent = 'Driver QR Code'; title.style.fontWeight = '700'; title.style.marginBottom = '8px';
              const subtitle = document.createElement('div'); subtitle.textContent = `Driver ID: ${driver.id}`; subtitle.style.fontSize = '12px'; subtitle.style.color = '#666'; subtitle.style.marginBottom = '12px';
              const btnRow = document.createElement('div'); btnRow.style.display = 'flex'; btnRow.style.gap = '8px'; btnRow.style.justifyContent = 'center';
              const downloadBtn = document.createElement('button'); downloadBtn.textContent = 'Download QR'; downloadBtn.style.padding = '8px 12px'; downloadBtn.style.borderRadius = '8px'; downloadBtn.style.border = 'none'; downloadBtn.style.background = '#0ea5a5'; downloadBtn.style.color = 'white';
              downloadBtn.onclick = async ()=>{ try { const qrRes = await fetch(qrUrl); if (qrRes.ok) { const blob = await qrRes.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `driver_${driver.id}.png`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); } } catch(e){console.warn('download failed', e);} };
              const regenBtn = document.createElement('button'); regenBtn.textContent = 'Regenerate'; regenBtn.style.padding = '8px 12px'; regenBtn.style.borderRadius = '8px'; regenBtn.style.border = '1px solid #ddd'; regenBtn.onclick = async ()=>{ try { const newQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&t=${Date.now()}`; img.src = newQrUrl; } catch(e){console.warn('regenerate failed', e);} };
              const closeBtn = document.createElement('button'); closeBtn.textContent = 'Close'; closeBtn.style.padding = '8px 12px'; closeBtn.style.borderRadius = '8px'; closeBtn.style.border = '1px solid #ddd'; closeBtn.onclick = ()=>{ document.body.removeChild(wrapper); };
              btnRow.appendChild(downloadBtn); btnRow.appendChild(regenBtn); btnRow.appendChild(closeBtn);
              box.appendChild(title); box.appendChild(img); box.appendChild(subtitle); box.appendChild(btnRow); wrapper.appendChild(box); document.body.appendChild(wrapper);
            }}>Show QR</Button>
            <Button className="flex-1" onClick={async ()=>{
              if (!driver) return alert('No driver');
              // regenerate server-side id? For now just regenerate QR image
              const origin = window.location.origin;
              const qrData = `${origin}/user/verify?code=${encodeURIComponent(driver.id)}`;
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData)}&t=${Date.now()}`;
              try {
                const qrRes = await fetch(qrUrl);
                if (qrRes.ok) {
                  const blob = await qrRes.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = `driver_${driver.id}.png`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                }
              } catch(e){ console.warn('regenerate download failed', e); }
            }}>Regenerate QR</Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
