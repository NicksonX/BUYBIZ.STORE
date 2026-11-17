import { PageHeader } from "@/components/ui/page-header";
import { requireAdminPage } from "@/server/auth/guards";
import { AiCommandConsole } from "@/components/admin/ai-command-console";
export const dynamic = "force-dynamic";
export default async function AiCommandPage() {
  await requireAdminPage();
  return <div><PageHeader eyebrow="Operations" title="AI Command Centre" description="Project-aware, read-only operational assistant with live BUYBIZ data. Gemini free tier is optional; a deterministic console works without any API key." /><div className="mt-4"><AiCommandConsole /></div></div>;
}
