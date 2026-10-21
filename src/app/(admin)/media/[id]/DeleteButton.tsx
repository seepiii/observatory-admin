"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteReport } from "../actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded-full bg-[#e98a6a] px-4 py-2 font-mono text-xs font-bold tracking-[0.15em] text-[#1a0d08] uppercase hover:bg-[#f2a88d] disabled:opacity-60">
      {pending ? "Deleting…" : "Yes, delete it"}
    </button>
  );
}

// Two clicks on purpose: first arms it, second deletes.
export default function DeleteButton({ id }: { id: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} className="rounded-full border border-[#e98a6a]/60 px-4 py-2 font-mono text-xs tracking-[0.15em] text-[#e98a6a] uppercase hover:bg-[#e98a6a]/10">
        Delete report…
      </button>
    );
  }
  return (
    <form action={deleteReport} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <ConfirmButton />
      <button type="button" onClick={() => setArmed(false)} className="font-mono text-xs text-white/60 uppercase hover:text-white">Cancel</button>
    </form>
  );
}
