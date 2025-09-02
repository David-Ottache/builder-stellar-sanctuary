import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { useState } from "react";

export default function RegisterName() {
  const { onboarding, setOnboarding } = useAppStore();
  const [first, setFirst] = useState(onboarding.firstName || "");
  const [last, setLast] = useState(onboarding.lastName || "");
  const nav = useNavigate();
  return (
    <Layout>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="text-3xl font-extrabold leading-tight">Lets Get\nStarted</h1>
        <p className="mt-1 text-sm text-neutral-600">Become A Driver</p>
        <div className="mt-6 space-y-3">
          <input value={first} onChange={(e)=>setFirst(e.target.value)} placeholder="First Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input value={last} onChange={(e)=>setLast(e.target.value)} placeholder="Last Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <Button className="h-12 w-full rounded-full" onClick={()=>{ setOnboarding({ firstName:first, lastName:last }); nav("/register/contact"); }}>Next</Button>
          <div className="text-center text-sm">Already Have An Account? <Link to="/login" className="font-semibold">Sign In</Link></div>
        </div>
      </div>
    </Layout>
  );
}
