import Link from "next/link";
import Panel from "@/components/Panel";
import CreateForm from "./CreateForm";

// Gemini can take up to ~25s when the bigger models are busy.
export const maxDuration = 60;

export default function NewReportPage() {
  return (
    <Panel
      title="Generate a new report"
      hint="CREATE: Gemini writes it with the same prompts the main app uses. It's credited to you and appears in the Observatory rankings immediately."
    >
      <CreateForm />
      <Link href="/media" className="font-mono text-xs tracking-[0.15em] text-white/50 uppercase hover:text-white">← Back to AI media</Link>
    </Panel>
  );
}
