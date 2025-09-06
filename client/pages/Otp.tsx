import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Otp() {
  const [code, setCode] = useState(["", "", "", ""]);
  const nav = useNavigate();
  const canSubmit = code.every(Boolean);
  return (
    <Layout hideTopBar hideBottomNav>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <div className="text-xs font-semibold text-neutral-700">
          OTP VERIFICATION
        </div>
        <h1 className="mt-1 text-2xl font-extrabold">
          Please Enter OTP Verification
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Please Input The OTP Code That Was Sent To The Number You Provided
        </p>
        <div className="mt-5 flex justify-between gap-3">
          {code.map((v, i) => (
            <input
              key={i}
              value={v}
              maxLength={1}
              onChange={(e) => {
                const next = [...code];
                next[i] = e.target.value.replace(/[^0-9]/g, "");
                setCode(next);
              }}
              className="h-14 w-14 rounded-xl border bg-neutral-100 text-center text-xl outline-none focus:bg-white"
            />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          <Button
            className="h-12 w-full rounded-full"
            disabled={!canSubmit}
            onClick={() => nav("/vehicle")}
          >
            Verify Code
          </Button>
          <Button variant="outline" className="h-12 w-full rounded-full">
            Send Again
          </Button>
        </div>
      </div>
    </Layout>
  );
}
