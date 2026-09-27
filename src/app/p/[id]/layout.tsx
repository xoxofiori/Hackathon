import { SideBanner } from "@/components/app/side-banner";
import { PartnershipNav } from "@/components/app/partnership-nav";
import { Badge } from "@/components/ui/badge";
import { getPartnershipContext, sideName } from "@/lib/data/partnership";

export default async function PartnershipLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getPartnershipContext(id);
  return (
    <>
      <SideBanner ctx={ctx} />
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{ctx.partnership.name}</h1>
            {ctx.partnership.is_internal && <Badge variant="muted">internal</Badge>}
            {ctx.partnership.status !== "active" && <Badge variant="warning">{ctx.partnership.status}</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {ctx.sides.map((s, i) => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                {i > 0 && <span>×</span>}
                <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {sideName(s)}
              </span>
            ))}
          </div>
          <div className="mt-3">
            <PartnershipNav id={id} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6">{children}</div>
    </>
  );
}
