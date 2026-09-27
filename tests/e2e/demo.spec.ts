import { expect, test, type Page } from "@playwright/test";

const card = (page: Page, id: string) => page.locator(`#item-${id}`);
const section = (page: Page, name: string | RegExp) => page.getByRole("region", { name });

test("analysis: approve / push back, company-only to-dos, persona switch, persistence", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Budget & deliverables sign-off");
  await page.getByRole("radio", { name: "Luca" }).click();

  // Side panel: Aurel's to-dos and goals only.
  const panel = page.getByRole("complementary", { name: "Aurel Watches to-dos" });
  await expect(panel.getByText("Only Aurel Watches sees this")).toBeVisible();
  await expect(panel.getByText("Send Aurel logo lockups for the end credits")).toBeVisible();
  await expect(panel.getByText("Reach 5M views of Aurel-branded content")).toBeVisible();
  await expect(page.getByText("Share the music cue sheet for episode 1")).toHaveCount(0);
  await expect(page.getByText("Protect editorial independence")).toHaveCount(0);
  await expect(panel.getByRole("listitem").first()).toContainText("Answer:"); // blocking answers first

  // Approve a pending commitment Wildframe already approved → Approved.
  const needs = section(page, "Needs your decision");
  await expect(card(page, "prototypes").getByText("Pending")).toBeVisible();
  await expect(card(page, "prototypes")).toContainText("Sophie Keller");
  await card(page, "prototypes").getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toHaveText("Approved for Aurel Watches.");
  await expect(needs.locator("#item-prototypes")).toHaveCount(0);
  await page.getByText(/Approved & closed/).click();
  await expect(card(page, "prototypes").getByText("Approved", { exact: true })).toBeVisible();

  // A pushed-back card can't be approved until Aurel answers the question on it.
  const footage = card(page, "footage");
  await expect(footage.getByText("Pushed back")).toBeVisible();
  await expect(footage.getByRole("button", { name: "Approve" })).toBeDisabled();
  await footage.getByRole("button", { name: "Firm: by 20 March 2027" }).click();
  await footage.getByRole("button", { name: "Send answer" }).click();
  await footage.getByRole("button", { name: "Approve" }).click();
  await expect(footage).toContainText("You approved · waiting for Wildframe Media.");
  await expect(section(page, "Waiting on Wildframe Media").locator("#item-footage")).toHaveCount(1);

  // Switch to Maya in the same window.
  await page.getByRole("radio", { name: "Maya" }).click();
  await expect(page.getByRole("complementary", { name: "Wildframe Media to-dos" })).toBeVisible();
  await expect(page.getByText("Send Aurel logo lockups for the end credits")).toHaveCount(0);
  await card(page, "footage").getByRole("button", { name: "Approve" }).click();
  await expect(section(page, "Needs your decision").locator("#item-footage")).toHaveCount(0);

  // Push back with a question → Pushed back, now waiting on Aurel.
  const bts = card(page, "bts");
  await bts.getByRole("button", { name: "Push back" }).click();
  await bts.getByLabel("Your question").fill("Can we agree on at least 40 images, delivered within two weeks?");
  await bts.getByRole("button", { name: "Send question" }).click();
  await expect(bts.getByText("Pushed back")).toBeVisible();
  await expect(section(page, "Waiting on Aurel Watches").locator("#item-bts")).toHaveCount(1);

  // Push back with new wording → Pending again, both sides approve the new version.
  const premiere = card(page, "premiere");
  await premiere.getByRole("button", { name: "Push back" }).click();
  await premiere.getByRole("radio", { name: "Suggest new wording" }).click();
  await premiere.getByLabel("New wording").fill("Aurel Watches hosts the Season 3 premiere in Geneva on 29 January 2027; Wildframe provides the screening copy.");
  await premiere.getByRole("button", { name: "Propose change" }).click();
  await expect(premiere).toContainText("on 29 January 2027");
  await expect(premiere).toContainText("Needs approval from both sides.");

  // Check off a Wildframe task.
  const wfPanel = page.getByRole("complementary", { name: "Wildframe Media to-dos" });
  await wfPanel.getByRole("button", { name: "Complete: Share the music cue sheet for episode 1" }).click();
  await expect(wfPanel.getByRole("button", { name: "Complete: Share the music cue sheet for episode 1" })).toHaveCount(0);

  // Everything is saved in the browser.
  await page.reload();
  await page.getByText(/Approved & closed/).click();
  await expect(card(page, "footage").getByText("Approved", { exact: true })).toBeVisible();
  await expect(card(page, "bts").getByText("Pushed back")).toBeVisible();

  // Reset restores the sample.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(card(page, "prototypes").getByText("Pending")).toBeVisible();
});

test("commitments page uses the same cards for every commitment", async ({ page }) => {
  await page.goto("/commitments");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Commitments");
  await page.getByText(/Approved & closed/).click();
  await expect(card(page, "fee").getByText("Approved", { exact: true })).toBeVisible();
});

test("demo mode: live-only routes send people to the demo", async ({ page }) => {
  await page.goto("/partnerships");
  await expect(page).toHaveURL(/\/demo$/);
});
