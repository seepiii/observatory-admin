import { requireAdmin } from "@/lib/supabase-server";
import NavLinks from "@/components/NavLinks";
import { signOut } from "../actions";

// Every page in this group is superadmin-only (the proxy checks too).
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireAdmin();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] tracking-[0.3em] text-[#7ee2a8] uppercase">● Superadmin · Earth Observatory</p>
          <h1 className="text-2xl font-bold text-white">Observatory Admin</h1>
        </div>
        <div className="flex items-center gap-3">
          {profile.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <span className="font-mono text-xs text-white/60">{profile.email}</span>
          <form action={signOut}>
            <button className="rounded-full border border-white/20 px-3 py-1 font-mono text-xs tracking-[0.15em] text-white/60 uppercase hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <NavLinks />
      {children}
    </div>
  );
}
