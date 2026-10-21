import GoogleButton from "./GoogleButton";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="hud-panel flex w-full max-w-sm flex-col gap-5 p-8 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-[#e98a6a] uppercase">Restricted · superadmins only</p>
        <h1 className="text-3xl font-bold text-white">Observatory Admin</h1>
        <p className="text-sm text-white/60">
          The control room for the Earth Observatory&apos;s database. Sign in with Google; only accounts with{" "}
          <code className="font-mono text-[#f4dfa6]">profiles.is_superadmin = true</code> get in.
        </p>
        {error && <p className="rounded border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">Sign-in failed. Try again.</p>}
        <GoogleButton />
      </div>
    </main>
  );
}
