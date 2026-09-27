import type { DemoUserKey } from "../setup/demo-ids";

/** One transcript line: who spoke, and what they said. */
export type SampleLine = readonly [DemoUserKey, string];
/** Returns YYYY-MM-DD `offset` days from the reference day, so dates stay relative to "today". */
export type DayFn = (offset: number) => string;

/**
 * The Wildframe × Aurel sample meetings. Shared by the database seed and the
 * browser-only demo so both tell exactly the same story.
 */
export const SAMPLE_TRANSCRIPTS: Record<"m1" | "m2" | "m3", (d: DayFn) => SampleLine[]> = {
  /** Kickoff: Season 3 sponsorship scope */
  m1: (): SampleLine[] => [
    ["maya", "Thanks for making the time, Luca. Our goal today is to agree the overall shape of Aurel's Season 3 sponsorship of Wild Horizons."],
    ["luca", "Thank you, Maya. For us the series is a natural fit — expedition filmmaking, precision, endurance."],
    ["maya", "We're proposing a presenting sponsorship at 1.2 million Swiss francs, paid in two instalments."],
    ["luca", "That is within the range we discussed internally. We can agree to 1.2 million in two instalments — the first on signature, the second on delivery of episode four."],
    ["jordan", "In return we'd produce three sixty-second branded vignettes that run alongside episodes two, four and six."],
    ["sophie", "And the Aurel logo would be in the end credits of every episode?"],
    ["maya", "Yes — end credits on all eight episodes. That's standard for presenting partners."],
    ["hiroshi", "Our legal team will need to review the addendum. We usually take a few weeks."],
    ["luca", "One more thing. It would be important for us to have some say in how the watches appear on screen."],
    ["maya", "We can definitely show you cuts ahead of time. Final editorial control has to stay with us, though."],
    ["luca", "We understand. We will consider it."],
    ["jordan", "Great. So the fee, the vignettes and the credits — shall we write those up for signature?"],
    ["luca", "Yes, please send them. We sign those three."],
  ],
  /** Creative review: vignette concepts */
  m2: (d: DayFn): SampleLine[] => [
    ["priya", "We've shared three vignette concepts: Glacier, Night Sky and Base Camp."],
    ["sophie", "The team in Geneva loved Night Sky. Base Camp might be a bit rough for our audience."],
    ["jordan", "Understood. We could soften Base Camp, or swap it for a sunrise summit sequence."],
    ["luca", "Perhaps it would be good to see the summit version as well."],
    ["maya", "On product shots: we'll share every shot featuring a watch for comment, five working days before picture lock."],
    ["luca", "That works for us. Comments only — we understand the edit is yours."],
    ["priya", `We'll share the rough cut of episode one by ${d(-15)}.`],
    ["luca", "Good. And our social team will expect weekly posts from the set."],
    ["maya", "Let's move on to the premiere timeline."],
    ["sophie", "We are thinking of a premiere in Geneva, perhaps in the first quarter."],
    ["maya", "Q1 would work well for us — January is ideal for the launch."],
    ["hiroshi", "The addendum review is ongoing. We will come back to you soon."],
  ],
  /** Budget & deliverables sign-off */
  m3: (d: DayFn): SampleLine[] => [
    ["maya", "Today we want to finalise the fourth vignette, the prototypes for filming, and the premiere."],
    ["luca", "Aurel would like to add a fourth vignette for episode eight. We can offer an additional 150,000 francs."],
    ["jordan", "That works. Four vignettes then — episodes two, four, six and eight."],
    ["sophie", `For filming in Patagonia we will send two watch prototypes to Buenos Aires by ${d(8)}.`],
    ["luca", "It would be nice to have the footage by spring."],
    ["priya", "Spring in Patagonia starts in September, so the shoot is timed for that."],
    ["luca", "Also — and I know this was discussed — we would still like final cut approval on the vignettes."],
    ["maya", "I'm sorry, we can't offer final cut. The product-shot preview process stays as agreed."],
    ["luca", "Understood. Then we accept the previews."],
    ["hiroshi", "We will handle the product placement approvals."],
    ["maya", "On the premiere — late January in Geneva, Aurel hosts and we provide the screening copy?"],
    ["luca", "Yes, late January. We host."],
    ["jordan", "One risk: the weather window in Patagonia could push the shoot back by two weeks."],
    ["maya", "We'll also send a behind-the-scenes photo package, about forty images."],
  ],
};
