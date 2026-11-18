import { PageHeader } from "@/components/ui/page-header";
import { requireAdminPage } from "@/server/auth/guards";
import { AiCommandConsole } from "@/components/admin/ai-command-console";
export const dynamic = "force-dynamic";
export default async function AiCommandPage() {
  await requireAdminPage();
  return <div className="mx-auto w-full max-w-[980px] px-1 pb-6"><PageHeader eyebrow="Operations" title="AI Command Centre" description="A live operational assistant for BUYBIZ. Reads real treasury, giveaway, claim and payment data. Gemini is optional; deterministic fallback always works." /><div className="mt-5 overflow-hidden rounded-[16px] border border-[#E3E4E7] bg-white shadow-[0_24px_60px_-45px_rgba(0,0,0,0.45)]"><AiCommandConsole /></div></div>;
}
