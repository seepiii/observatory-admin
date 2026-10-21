import { createSupabaseServer } from "@/lib/supabase-server";
import { signOut } from "../actions";

export default async function DeniedPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="hud-panel flex w-full max-w-md flex-col gap-4 p-8 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-[#e98a6a] uppercase">Access denied</p>
        <h1 className="text-2xl font-bold text-white">Superadmins only</h1>
        <p className="text-sm text-white/60">
          {user ? <>You&apos;re signed in as <strong className="text-white">{user.email}</strong>, but </> : "This "}
          account isn&apos;t a superadmin, so the admin area stays locked. Nothing in the database is visible to you here.
        </p>
        {user && (
          <form action={signOut}>
            <button className="rounded-full border border-white/20 px-5 py-2 font-mono text-xs tracking-[0.2em] text-white/70 uppercase hover:text-white">
              Sign out
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
