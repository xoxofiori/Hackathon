import { DemoHeader } from "@/components/demo/demo-header";

/** The analysis / sign-off room keeps its own header with the persona toggle. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoHeader />
      {children}
    </>
  );
}
