import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
        <h1 className="text-lg font-semibold text-zinc-100 mb-1">
          Connecté
        </h1>
        <p className="text-sm text-zinc-500 mb-5">{user.email}</p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
