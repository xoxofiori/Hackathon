import type { DemoPerson, DemoSide, PersonaKey, SideKey } from "./types";
import type { DemoUserKey } from "@/lib/setup/demo-ids";

export const SIDES: Record<SideKey, DemoSide> = {
  A: { key: "A", label: "Wildframe Media", color: "#0f766e" },
  B: { key: "B", label: "Aurel Watches", color: "#b45309" },
};

export const PEOPLE: Partial<Record<DemoUserKey, DemoPerson>> = {
  maya: { key: "maya", name: "Maya Chen", title: "Partnerships Lead", side: "A", canSign: true },
  jordan: { key: "jordan", name: "Jordan Okafor", title: "Executive Producer", side: "A", canSign: false },
  priya: { key: "priya", name: "Priya Nair", title: "Post-production Manager", side: "A", canSign: false },
  luca: { key: "luca", name: "Luca Brunner", title: "Brand Director", side: "B", canSign: true },
  sophie: { key: "sophie", name: "Sophie Keller", title: "Marketing Manager", side: "B", canSign: false },
  hiroshi: { key: "hiroshi", name: "Hiroshi Tanaka", title: "Legal Counsel", side: "B", canSign: true },
};

/** The two personas you can switch between in the demo header. */
export const DEMO_PEOPLE: Record<PersonaKey, DemoPerson> = {
  maya: PEOPLE.maya!,
  luca: PEOPLE.luca!,
};
