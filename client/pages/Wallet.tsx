import Layout from "@/components/app/Layout";
import { Button } from "@/components/ui/button";

const TX = [
  { id: 1, name: "Joe Goldberg", amount: 50000, sign: "+", avatar: "https://i.pravatar.cc/80?img=5" },
  { id: 2, name: "Spongebob Sp", amount: 75000, sign: "-", avatar: "https://i.pravatar.cc/80?img=22" },
  { id: 3, name: "Kratos", amount: 150000, sign: "+", avatar: "https://i.pravatar.cc/80?img=11" },
];

export default function Wallet() {
  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-neutral-600">My Balance</div>
          <div className="mt-1 text-3xl font-extrabold">₦125,500.00</div>
          <div className="mt-4 flex gap-3">
            <Button className="h-10 flex-1 rounded-full">Send</Button>
            <Button variant="secondary" className="h-10 flex-1 rounded-full">Request</Button>
          </div>
          <div className="mt-2">
            <Button variant="outline" className="h-10 w-full rounded-full">Top Up</Button>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border bg-white p-2">
          {TX.map((t)=> (
            <div key={t.id} className="flex items-center gap-3 rounded-xl p-2">
              <img src={t.avatar} className="h-9 w-9 rounded-full object-cover" />
              <div className="flex-1">
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-neutral-600">Today 12:30 PM</div>
              </div>
              <div className={t.sign==='+'? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                {t.sign}₦{t.amount.toLocaleString()}.00
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
