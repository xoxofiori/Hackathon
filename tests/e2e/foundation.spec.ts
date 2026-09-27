import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now();
const password = "e2e-password-123";

async function signUpAndOnboard(page: Page, name: string, org: string, team = "") {
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Work email").fill(`${name.split(" ")[0].toLowerCase()}.${stamp}@e2e.test`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/onboarding/);
  await page.getByLabel("Title").fill("Lead");
  await page.getByLabel("Organization").fill(org);
  if (team) await page.getByLabel(/Team, branch/).fill(team);
  await page.getByLabel("Languages").fill("en");
  await page.getByRole("button", { name: "Continue" }).click();
}

test("demo personas see their own side and nothing private from the other", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Enter demo as Luca Brunner/ }).click();
  await expect(page.getByText("You're on Aurel Watches")).toBeVisible();
  await expect(page.getByText("Awaiting signature")).toBeVisible();
  // Wildframe's private activity (its caucus goals, expectations) must not appear for Luca.
  await expect(page.getByText("Maya Chen added a goal")).toHaveCount(0);
});

test("create a partnership, then the other side's lead claims it by invite link", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  await a.goto("/signup");
  await signUpAndOnboard(a, "Ana Costa", `Northwind ${stamp}`);
  await a.waitForURL(/partnerships/);
  await a.goto("/partnerships/new");
  await a.getByLabel("Partnership name").fill(`Northwind × Helio ${stamp}`);
  await a.getByLabel("Organization", { exact: true }).last().fill(`Helio ${stamp}`);
  await a.getByLabel("Side name").last().fill("Helio");
  await a.getByRole("button", { name: "Create partnership" }).click();
  await a.waitForURL(/members\?created=1/);
  await expect(a.getByText("Claim link for their lead")).toBeVisible();
  const claimUrl = await a.locator("code").first().innerText();

  const b = await (await browser.newContext()).newPage();
  await b.goto(claimUrl);
  await expect(b.getByText(`Northwind × Helio ${stamp}`)).toBeVisible();
  await b.getByRole("link", { name: "Create an account" }).click();
  await signUpAndOnboard(b, "Ben Okoye", `Helio ${stamp}`);
  await b.waitForURL(/invite/);
  await b.getByRole("button", { name: /Claim Helio/ }).click();
  await b.waitForURL(/\/p\//);
  await expect(b.getByText("You're on Helio")).toBeVisible();
  await expect(b.getByText("Side owner")).toBeVisible();
  await expect(b.getByText("Authorized signer")).toBeVisible();

  // The claim link is single-use.
  const c = await (await browser.newContext()).newPage();
  await c.goto(claimUrl);
  await expect(c.getByText(/expired or has already been used/)).toBeVisible();
});
