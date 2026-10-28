"use client";

import { useActionState, useEffect, useRef } from "react";
import type { Field } from "@/lib/resources";
import { createRow, updateRow } from "./actions";

export type Option = { value: string; label: string };

const input = "rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#e9c46a]/60";

export default function RowForm({
  resource,
  fields,
  options,
  row,
  rowId,
}: {
  resource: string;
  fields: Field[];
  options: Record<string, Option[]>;
  /** Present when editing; absent when creating. */
  row?: Record<string, unknown>;
  rowId?: string;
}) {
  const editing = rowId !== undefined;
  const [state, action, pending] = useActionState(editing ? updateRow : createRow, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // After creating, clear the form for the next row.
  useEffect(() => {
    if (state?.saved && !editing) formRef.current?.reset();
  }, [state, editing]);

  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="_resource" value={resource} />
      {editing && <input type="hidden" name="_id" value={rowId} />}
      {fields.map((f) => {
        const value = row?.[f.name];
        const wide = f.type === "textarea" ? "sm:col-span-2" : "";
        if (f.type === "boolean") {
          return (
            <label key={f.name} className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" name={f.name} defaultChecked={editing ? value === true : true} className="h-4 w-4 accent-[#e9c46a]" />
              {f.label}
            </label>
          );
        }
        return (
          <label key={f.name} className={`flex flex-col gap-1 ${wide}`}>
            <span className="font-mono text-[11px] tracking-[0.15em] text-white/50 uppercase">
              {f.label}
              {f.required && " *"}
            </span>
            {f.type === "textarea" ? (
              <textarea name={f.name} defaultValue={(value as string) ?? ""} required={f.required} rows={4} className={`${input} font-mono`} />
            ) : f.type === "ref" ? (
              <select name={f.name} defaultValue={value == null ? "" : String(value)} required={f.required} className={input}>
                <option value="">—</option>
                {(options[f.name] ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                name={f.name}
                type={f.type === "number" ? "number" : "text"}
                defaultValue={value == null ? "" : String(value)}
                required={f.required}
                className={input}
              />
            )}
          </label>
        );
      })}
      <div className="flex items-center gap-4 sm:col-span-2">
        <button disabled={pending} className="rounded-full bg-[#e9c46a] px-5 py-2 font-mono text-xs font-bold tracking-[0.15em] text-[#1a1408] uppercase hover:bg-[#f4dfa6] disabled:opacity-60">
          {pending ? "Saving…" : editing ? "Save changes" : "Add"}
        </button>
        {state?.saved && !pending && <span className="text-sm text-[#7ee2a8]">Saved ✓</span>}
        {state?.error && <span className="text-sm text-red-300">{state.error}</span>}
      </div>
    </form>
  );
}
