import Layout from "@/components/app/Layout";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Verify() {
  const { verifyDriver } = useAppStore();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(() => verifyDriver("d1"));

  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Verify Driver</h1>
        <p className="mt-1 text-sm text-neutral-600">Scan a QR code or enter assigned driver ID.</p>

        <div className="mt-4 rounded-2xl border bg-white p-4">
          <div className="relative mx-auto h-44 w-full max-w-xs rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50">
            <div className="absolute inset-6 rounded border-2 border-primary/70" />
            <div className="absolute inset-0 flex items-end justify-center p-3">
              <Button variant="secondary" className="rounded-full" onClick={()=>{ setCode("d2"); setResult(verifyDriver("d2")); }}>Simulate Scan (Akondu)</Button>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Enter driver ID e.g. d1 or QR text" className="flex-1 rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
            <Button onClick={()=>setResult(verifyDriver(code))}>Check</Button>
          </div>
        </div>

        {result ? (
          <div className="mt-4 rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <img src={result.avatar} className="h-12 w-12 rounded-full object-cover" />
              <div>
                <div className="font-semibold">{result.name}</div>
                <div className="text-xs text-neutral-600">{result.rides} rides • {result.rating} rating</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-green-700">Driver verified • ID matched</div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border bg-white p-4 text-sm text-red-600">No driver found for provided code.</div>
        )}
      </div>
    </Layout>
  );
}
