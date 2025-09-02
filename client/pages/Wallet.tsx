import Layout from "@/components/app/Layout";

export default function Wallet() {
  return (
    <Layout>
      <div className="px-4 pt-6">
        <h1 className="text-2xl font-bold">Wallet</h1>
        <div className="mt-3 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-neutral-600">Balance</div>
          <div className="mt-1 text-3xl font-extrabold">$0.00</div>
        </div>
      </div>
    </Layout>
  );
}
