import { expect, test, type Page } from "@playwright/test";

const card = (page: Page, id: string) => page.locator(`#item-${id}`);

test("demo mode: sign-offs, pushbacks, persona toggle, privacy and persistence — all in the browser", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Enter demo as Luca Brunner/ }).click();
  await page.waitForURL(/\/demo/);
  await expect(page.getByText("You're Luca Brunner on Aurel Watches")).toBeVisible();

  // Pre-generated ambiguity flags (no API key in this environment).
  await expect(page.getByText("Pre-generated flags")).toBeVisible();
  await expect(page.getByText("Scope unclear").first()).toBeVisible();

  // Aurel's private panel: its own goals, never Wildframe's.
  await expect(page.getByText("Reach 5M views of Aurel-branded content")).toBeVisible();
  await expect(page.getByText("Protect editorial independence")).toHaveCount(0);

  // Luca countersigns the prototypes → committed.
  await card(page, "prototypes").getByRole("button", { name: "Sign for Aurel Watches" }).click();
  await expect(card(page, "prototypes").getByText("Committed").first()).toBeVisible();

  // "Footage by spring" can't be signed until its clarification is answered.
  await expect(card(page, "footage").getByRole("button", { name: "Sign for Aurel Watches" })).toBeDisabled();
  const queue = page.locator("article", { hasText: "it would be nice to have the footage by spring" }).filter({ has: page.getByRole("button", { name: "Answer and resolve" }) });
  await queue.getByLabel("Your answer").fill("Firm: by 20 March 2027.");
  await queue.getByRole("button", { name: "Answer and resolve" }).click();
  await card(page, "footage").getByRole("button", { name: "Sign for Aurel Watches" }).click();
  await expect(card(page, "footage").getByText("Signed by one side").first()).toBeVisible();

  // Switch to Maya in the same window.
  await page.getByRole("radio", { name: /Maya Chen/ }).click();
  await expect(page.getByText("You're Maya Chen on Wildframe Media")).toBeVisible();
  await expect(page.getByText("Protect editorial independence")).toBeVisible();
  await expect(page.getByText("Reach 5M views of Aurel-branded content")).toHaveCount(0);
  await expect(page.getByText("We can live without final cut")).toHaveCount(0); // Aurel's private note

  await card(page, "footage").getByRole("button", { name: "Sign for Wildframe Media" }).click();

  // Pushback: Maya raises the "150,000 francs" flag → the vignette amendment is blocked for Luca.
  await page.locator("li", { hasText: "We can offer an additional 150,000 francs." }).getByRole("button", { name: "Ask Aurel Watches" }).click();
  await expect(card(page, "vignettes").getByText("Needs clarification").first()).toBeVisible();

  // Pushback: propose new wording on the photo package.
  await card(page, "bts").getByRole("button", { name: "Propose changes" }).click();
  await card(page, "bts").getByLabel("New wording").fill("Wildframe delivers at least 40 behind-the-scenes images to Aurel within two weeks of the shoot.");
  await card(page, "bts").getByRole("button", { name: "Propose new wording" }).click();
  await expect(card(page, "bts").getByText("v2").first()).toBeVisible();

  // Everything survives a reload (stored in the browser).
  await page.reload();
  await expect(page.getByText("You're Maya Chen on Wildframe Media")).toBeVisible();
  await page.getByRole("button", { name: "Commitments" }).click();
  await expect(card(page, "footage").getByText("Committed").first()).toBeVisible();
  await page.getByRole("button", { name: "Meeting review" }).click();

  await page.getByRole("radio", { name: /Luca Brunner/ }).click();
  await expect(card(page, "vignettes").getByRole("button", { name: "Sign for Aurel Watches" })).toBeDisabled();

  // Reset restores the sample.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await expect(card(page, "prototypes").getByText("Signed by one side").first()).toBeVisible();
});

test("demo mode: live-only routes send people to the demo", async ({ page }) => {
  await page.goto("/partnerships");
  await expect(page).toHaveURL(/\/demo$/);
});
