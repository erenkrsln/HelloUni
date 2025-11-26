import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-slate-900">
          Willkommen, {session.user.name}!
        </h1>
        <p className="mt-2 text-slate-600">
          Du bist erfolgreich eingeloggt. Hier kommt bald dein Dashboard.
        </p>
        
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Deine Session</h2>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-50 p-4 text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}









