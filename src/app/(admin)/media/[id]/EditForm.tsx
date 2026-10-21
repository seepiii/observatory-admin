"use client";

import { useActionState } from "react";
import { updateReport } from "../actions";

export default function EditForm({ id, subject, body }: { id: string; subject: string; body: string }) {
  const [state, action, pending] = useActionState(updateReport, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.15em] text-white/50 uppercase">Title</span>
        <input
          name="subject"
          defaultValue={subject}
          required
          maxLength={140}
          className="rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-white outline-none focus:border-[#e9c46a]/60"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.15em] text-white/50 uppercase">AI-written text</span>
        <textarea
          name="body"
          defaultValue={body}
          required
          rows={9}
          className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm leading-relaxed text-white outline-none focus:border-[#e9c46a]/60"
        />
      </label>
      <div className="flex items-center gap-4">
        <button
          disabled={pending}
          className="rounded-full bg-[#e9c46a] px-6 py-2.5 font-mono text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-[#f4dfa6] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state?.saved && !pending && <span className="text-sm text-[#7ee2a8]">Saved ✓</span>}
        {state?.error && <span className="text-sm text-red-300">{state.error}</span>}
      </div>
    </form>
  );
}
