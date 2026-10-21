"use client";

import { useActionState } from "react";
import { createReport } from "../actions";
import { CREATABLE, KIND_LABELS } from "@/lib/observatory";

const HELP: Record<string, string> = {
  field_note: "Describe something people do. The alien writes up its interpretation.",
  exoplanet: "Name a NYC place. The alien describes it as a newly discovered planet.",
};

export default function CreateForm() {
  const [state, action, pending] = useActionState(createReport, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-mono text-xs tracking-[0.15em] text-white/50 uppercase">Report type</legend>
        {CREATABLE.map((k, i) => (
          <label key={k} className="hud-panel flex cursor-pointer flex-col gap-1 p-4 has-[:checked]:border-[#e9c46a]/60 has-[:checked]:bg-[#e9c46a]/10">
            <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="sr-only" />
            <span className="font-bold text-white">{KIND_LABELS[k]}</span>
            <span className="text-sm text-white/55">{HELP[k]}</span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-xs tracking-[0.15em] text-white/50 uppercase">Subject</span>
        <input
          name="subject"
          required
          maxLength={140}
          placeholder="e.g. people napping in Butler Library"
          className="rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder-white/35 outline-none focus:border-[#e9c46a]/60"
        />
      </label>
      {state?.error && <p className="rounded border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-full bg-[#e9c46a] px-6 py-3 font-mono text-sm font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-[#f4dfa6] disabled:opacity-60"
      >
        {pending ? "Gemini is writing…" : "Generate with Gemini"}
      </button>
    </form>
  );
}
