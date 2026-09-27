/** Fixed ids for demo records so links and tests are stable across re-seeds. */
export const IDS = {
  orgWildframe: "0a000000-0000-4000-8000-000000000001",
  orgAurel: "0a000000-0000-4000-8000-000000000002",
  teamPartnerships: "0b000000-0000-4000-8000-000000000001",
  teamLA: "0b000000-0000-4000-8000-000000000002",
  teamLondon: "0b000000-0000-4000-8000-000000000003",
  teamBrand: "0b000000-0000-4000-8000-000000000004",
  p1: "0c000000-0000-4000-8000-000000000001",
  p1A: "0d000000-0000-4000-8000-000000000001",
  p1B: "0d000000-0000-4000-8000-000000000002",
  p2: "0c000000-0000-4000-8000-000000000002",
  p2A: "0d000000-0000-4000-8000-000000000003",
  p2B: "0d000000-0000-4000-8000-000000000004",
  m1: "0e000000-0000-4000-8000-000000000001",
  m2: "0e000000-0000-4000-8000-000000000002",
  m3: "0e000000-0000-4000-8000-000000000003",
  m4: "0e000000-0000-4000-8000-000000000004",
  m5: "0e000000-0000-4000-8000-000000000005",
  m6: "0e000000-0000-4000-8000-000000000006",
} as const;

export const DEMO_USERS = {
  maya: {
    email: "maya.chen@demo.accord.app", name: "Maya Chen", title: "Partnerships Lead", jobRole: "Partnerships",
    org: "Wildframe Media", side: "A", timezone: "America/Los_Angeles", languages: ["en", "zh"],
    notes: "Prefers short calls with a clear agenda; follows up in chat.",
  },
  jordan: {
    email: "jordan.okafor@demo.accord.app", name: "Jordan Okafor", title: "Executive Producer", jobRole: "Production",
    org: "Wildframe Media", side: "A", timezone: "America/Los_Angeles", languages: ["en"], notes: null,
  },
  priya: {
    email: "priya.nair@demo.accord.app", name: "Priya Nair", title: "Post-production Manager", jobRole: "Post-production",
    org: "Wildframe Media", side: "A", timezone: "America/Los_Angeles", languages: ["en", "hi"], notes: null,
  },
  sam: {
    email: "sam.rivera@demo.accord.app", name: "Sam Rivera", title: "VP Content", jobRole: "Executive",
    org: "Wildframe Media", side: "A", timezone: "America/New_York", languages: ["en", "es"],
    notes: "Read-only: tracks progress across partnerships.",
  },
  luca: {
    email: "luca.brunner@demo.accord.app", name: "Luca Brunner", title: "Brand Director", jobRole: "Brand",
    org: "Aurel Watches", side: "B", timezone: "Europe/Zurich", languages: ["de", "en", "fr"],
    notes: "Prefers a written recap after each call. Budget decisions go through the Geneva committee.",
  },
  sophie: {
    email: "sophie.keller@demo.accord.app", name: "Sophie Keller", title: "Marketing Manager", jobRole: "Marketing",
    org: "Aurel Watches", side: "B", timezone: "Europe/Zurich", languages: ["fr", "en"], notes: null,
  },
  hiroshi: {
    email: "hiroshi.tanaka@demo.accord.app", name: "Hiroshi Tanaka", title: "Legal Counsel", jobRole: "Legal",
    org: "Aurel Watches", side: "B", timezone: "Europe/Zurich", languages: ["ja", "en", "de"], notes: null,
  },
  olivia: {
    email: "olivia.hart@demo.accord.app", name: "Olivia Hart", title: "Head of London Studio", jobRole: "Post-production",
    org: "Wildframe Media", side: "B", timezone: "Europe/London", languages: ["en"], notes: null,
  },
  tom: {
    email: "tom.whitfield@demo.accord.app", name: "Tom Whitfield", title: "Series Producer", jobRole: "Production",
    org: "Wildframe Media", side: "B", timezone: "Europe/London", languages: ["en"], notes: null,
  },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;

/** The two one-click demo personas on the landing page. */
export const DEMO_PERSONAS = [
  { key: "maya", label: "Maya Chen", subtitle: "Partnerships Lead, Wildframe Media", color: "#0f766e" },
  { key: "luca", label: "Luca Brunner", subtitle: "Brand Director, Aurel Watches", color: "#b45309" },
] as const satisfies readonly { key: DemoUserKey; label: string; subtitle: string; color: string }[];
