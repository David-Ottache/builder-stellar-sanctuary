import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/lib/store";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAppStore();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="mx-4 mt-4 rounded-3xl bg-white p-6 shadow-soft">
        <h1 className="mb-6 text-2xl font-bold">Welcome Back</h1>
        <div className="space-y-3">
          <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full Name" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border bg-neutral-100 px-4 py-3 outline-none focus:bg-white" />
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <label className="inline-flex items-center gap-2"><input type="checkbox" className="rounded"/> Remember Me</label>
            <Link to="#" className="font-semibold">FORGOT PASSWORD?</Link>
          </div>
          <Button className="h-12 w-full rounded-full" onClick={()=>{ setUser({ firstName: name || "John", lastName: "Doe", email: "john@example.com", phone: "", countryCode: "+234", gender: "", location: "" }); navigate("/search"); }}>Login</Button>
          <div className="text-center text-sm">Dont Have An Account? <Link to="/register/name" className="font-semibold">Sign Up</Link></div>
        </div>
      </div>
    </Layout>
  );
}
