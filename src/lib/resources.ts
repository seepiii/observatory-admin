// Every simple table the admin area manages, described once. The generic pages in
// app/(admin)/[resource] read this to build their lists and forms.

export type FieldType = "text" | "textarea" | "number" | "boolean" | "ref";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** For "ref": the resource whose rows fill the dropdown. */
  ref?: string;
  /** Hidden from the list table (long text). */
  hideInList?: boolean;
};

export type Op = "create" | "update" | "delete";

export type Resource = {
  slug: string;
  table: string;
  title: string;
  hint: string;
  /** Column that names a row in dropdowns and headings. */
  labelField: string;
  fields: Field[];
  /** Read-only columns shown in the list only. */
  extraColumns?: { name: string; label: string }[];
  ops: Op[];
  orderBy: { column: string; ascending: boolean };
  /** Primary key column (default "id"). */
  key?: string;
};

const ALL: Op[] = ["create", "update", "delete"];

export const RESOURCES: Resource[] = [
  {
    slug: "prompt-chains",
    table: "prompt_chains",
    title: "Prompt chains",
    hint: "One chain per report type. Each chain runs its steps in order.",
    labelField: "name",
    fields: [
      { name: "slug", label: "Report kind", type: "text" },
      { name: "name", label: "Name", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
    ],
    ops: [],
    orderBy: { column: "id", ascending: true },
  },
  {
    slug: "prompt-chain-steps",
    table: "prompt_chain_steps",
    title: "Prompt chain steps",
    hint: "The steps inside each chain, in the order they run, and the model each one uses.",
    labelField: "name",
    fields: [
      { name: "chain_id", label: "Chain", type: "ref", ref: "prompt-chains" },
      { name: "step_order", label: "Step", type: "number" },
      { name: "name", label: "Name", type: "text" },
      { name: "model_id", label: "Model", type: "ref", ref: "llm-models" },
      { name: "instructions", label: "Instructions", type: "textarea" },
    ],
    ops: [],
    orderBy: { column: "chain_id", ascending: true },
  },
  {
    slug: "prompt-chain-mix",
    table: "prompt_chain_mix",
    title: "Prompt chain mix",
    hint: "How often each chain is picked, relative to the others. Weight 0 turns a chain off.",
    labelField: "chain_id",
    key: "chain_id",
    fields: [
      { name: "chain_id", label: "Chain", type: "ref", ref: "prompt-chains" },
      { name: "weight", label: "Weight", type: "number", required: true },
    ],
    extraColumns: [{ name: "updated_at", label: "Updated" }],
    ops: ["update"],
    orderBy: { column: "weight", ascending: false },
  },
  {
    slug: "terms",
    table: "terms",
    title: "Terms",
    hint: "The alien's glossary of human words.",
    labelField: "term",
    fields: [
      { name: "term", label: "Term", type: "text", required: true },
      { name: "definition", label: "Definition", type: "textarea", required: true },
      { name: "example", label: "Example", type: "textarea" },
    ],
    ops: ALL,
    orderBy: { column: "term", ascending: true },
  },
  {
    slug: "examples",
    table: "ai_generation_examples",
    title: "AI generation examples",
    hint: "Sample input → output pairs that show the AI what a good report looks like.",
    labelField: "input",
    fields: [
      { name: "chain_id", label: "Chain", type: "ref", ref: "prompt-chains" },
      { name: "input", label: "Input", type: "textarea", required: true },
      { name: "output", label: "Output", type: "textarea", required: true, hideInList: true },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
    ops: ALL,
    orderBy: { column: "id", ascending: true },
  },
  {
    slug: "llm-models",
    table: "llm_models",
    title: "LLM models",
    hint: "Models the app calls. Text models are tried in fallback order (1 first).",
    labelField: "name",
    fields: [
      { name: "provider_id", label: "Provider", type: "ref", ref: "llm-providers", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "model_key", label: "API model name", type: "text", required: true },
      { name: "purpose", label: "Purpose (text/vision/image)", type: "text", required: true },
      { name: "fallback_order", label: "Fallback order", type: "number", required: true },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
    ops: ALL,
    orderBy: { column: "fallback_order", ascending: true },
  },
  {
    slug: "llm-providers",
    table: "llm_providers",
    title: "LLM providers",
    hint: "Companies whose models the app uses. A provider with models can't be deleted.",
    labelField: "name",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "website", label: "Website", type: "text" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    ops: ALL,
    orderBy: { column: "name", ascending: true },
  },
  {
    slug: "signup-domains",
    table: "allowed_signup_domains",
    title: "Allowed sign-up domains",
    hint: "Anyone who first signs in with an email at one of these domains becomes an admin.",
    labelField: "domain",
    fields: [{ name: "domain", label: "Domain (e.g. columbia.edu)", type: "text", required: true }],
    extraColumns: [{ name: "created_at", label: "Added" }],
    ops: ALL,
    orderBy: { column: "domain", ascending: true },
  },
  {
    slug: "whitelist",
    table: "whitelisted_email_addresses",
    title: "Whitelisted e-mail addresses",
    hint: "Individual emails that become admins on first sign-in, whatever their domain.",
    labelField: "email",
    fields: [
      { name: "email", label: "Email", type: "text", required: true },
      { name: "note", label: "Note", type: "text" },
    ],
    extraColumns: [{ name: "created_at", label: "Added" }],
    ops: ALL,
    orderBy: { column: "email", ascending: true },
  },
];

export function getResource(slug: string) {
  return RESOURCES.find((r) => r.slug === slug) ?? null;
}

/** Turns submitted form values into a row, or an error message. */
export function parseForm(resource: Resource, form: FormData): { row: Record<string, unknown> } | { error: string } {
  const row: Record<string, unknown> = {};
  for (const f of resource.fields) {
    if (f.name === resource.key) continue; // primary keys aren't edited
    const raw = form.get(f.name);
    if (f.type === "boolean") {
      row[f.name] = raw === "on";
      continue;
    }
    const value = String(raw ?? "").trim();
    if (!value) {
      if (f.required) return { error: `${f.label} is required.` };
      row[f.name] = null;
      continue;
    }
    if (f.type === "number" || f.type === "ref") {
      const n = Number(value);
      if (!Number.isInteger(n)) return { error: `${f.label} must be a whole number.` };
      row[f.name] = n;
      continue;
    }
    row[f.name] = value;
  }
  if (resource.table === "allowed_signup_domains" && typeof row.domain === "string") {
    row.domain = row.domain.toLowerCase().replace(/^@/, "");
  }
  if (resource.table === "whitelisted_email_addresses" && typeof row.email === "string") {
    row.email = row.email.toLowerCase();
  }
  return { row };
}
