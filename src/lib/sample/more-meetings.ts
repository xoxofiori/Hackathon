import type { DayFn } from "./wildframe-aurel";

/** One transcript line: speaker's full name and what they said. */
export type NamedLine = readonly [string, string];

/**
 * Extra sample meetings outside the Wildframe × Aurel sponsorship, so demo mode
 * shows meetings sorted into more than one group. Dates stay relative to "today".
 */
export const MORE_TRANSCRIPTS: Record<"p1" | "p2" | "d1", (d: DayFn) => NamedLine[]> = {
  /** London post-production handoff (Wildframe LA × Wildframe London) */
  p1: (d) => [
    ["Olivia Hart", "London can take the colour grade for episodes one to four."],
    ["Maya Chen", `Great. Can you have those graded by ${d(20)}?`],
    ["Olivia Hart", "Yes, that's doable if the locked cuts arrive a week before."],
    ["Jordan Okafor", `We'll send locked cuts for one to four by ${d(6)}.`],
    ["Tom Whitfield", "We'll need the music licensing budget confirmed in Q1."],
    ["Maya Chen", "Q1 is fine, we'll sort that."],
    ["Tom Whitfield", "One more thing: we should agree on a single LUT pack so the LA and London grades match."],
    ["Olivia Hart", "I'll share our LUT pack with the LA team this week."],
  ],
  /** Colour grade review, episodes 1–2 */
  p2: (d) => [
    ["Tom Whitfield", "Episode one is graded. The night sequences came out darker than the LA reference."],
    ["Jordan Okafor", "Can we lift the shadows a little? The watch faces need to read clearly on screen."],
    ["Olivia Hart", "We can do that, but it might slip episode two by two days."],
    ["Maya Chen", "Two days is fine as long as the locked cuts for three and four still land on time."],
    ["Jordan Okafor", `Locked cuts for three and four are on track for ${d(3)}.`],
    ["Tom Whitfield", `Then we'll deliver the regraded episode one by ${d(2)} and episode two by ${d(9)}.`],
    ["Olivia Hart", "We're at about seventy percent of the post budget, so the music licence is the big open cost."],
    ["Maya Chen", "I'll get the licensing number from finance before our next sync."],
  ],
  /** Streaming rights intro with Northlight+ (a prospective distributor) */
  d1: (d) => [
    ["Daniel Reyes", "Thanks for the screener. Northlight+ is interested in exclusive streaming rights for Wild Horizons Season 3."],
    ["Maya Chen", "Great to hear. Which territories are you thinking about?"],
    ["Daniel Reyes", "North America and the Nordics, with a first window of eighteen months."],
    ["Aiko Mori", "We'd also want seasons one and two as library titles, if they're available."],
    ["Maya Chen", "Seasons one and two are free in North America. The Nordics are licensed until next summer."],
    ["Daniel Reyes", "We could probably work with that. Could you send the avails and a rate card?"],
    ["Maya Chen", `I'll send the avails and the rate card by ${d(4)}.`],
    ["Aiko Mori", "Does the sponsor branding stay in the episodes? Our ad policy may restrict on-screen brands."],
    ["Maya Chen", "The end-credit placement is contractual, so it stays. We can talk about the vignettes."],
    ["Daniel Reyes", `Let's aim to have a term sheet before ${d(30)}.`],
  ],
};
