import { expect, test } from "@playwright/test";

test("integrations page: connect Google Calendar, Linear and Notion", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Integrations" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Integrations");
  for (const name of ["Google Calendar", "Linear", "Notion"]) {
    const card = page.getByRole("listitem", { name });
    await card.getByRole("button", { name: "Connect" }).click();
    await expect(card.getByText("Connected", { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByRole("listitem", { name: "Linear" }).getByText("Connected", { exact: true })).toBeVisible();
  await page.getByRole("listitem", { name: "Notion" }).getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("listitem", { name: "Notion" }).getByRole("button", { name: "Connect" })).toBeVisible();
});

test("send an approved commitment to Linear", async ({ page }) => {
  await page.goto("/integrations");
  await page.getByRole("listitem", { name: "Linear" }).getByRole("button", { name: "Connect" }).click();
  await page.goto("/commitments");
  await page.getByText(/Approved & closed/).click();
  const fee = page.locator("#item-fee");
  await fee.getByRole("button", { name: "Send to Linear" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Issue created." }).first()).toBeVisible();
  await expect(fee.getByText(/Issue created · ACC-101/)).toBeVisible();
  // Pending commitments don't offer it.
  await expect(page.locator("#item-prototypes").getByRole("button", { name: "Send to Linear" })).toHaveCount(0);
  await page.reload();
  await page.getByText(/Approved & closed/).click();
  await expect(page.locator("#item-fee").getByText(/Issue created · ACC-101/)).toBeVisible();
});

test("send to Linear before connecting: connect and send in one click", async ({ page }) => {
  await page.goto("/commitments");
  await page.getByText(/Approved & closed/).click();
  const credits = page.locator("#item-credits");
  await credits.getByRole("button", { name: "Send to Linear" }).click();
  await expect(credits).toContainText("Linear isn't connected yet.");
  await credits.getByRole("button", { name: "Connect & send" }).click();
  await expect(credits.getByText(/Issue created · ACC-/)).toBeVisible();
  await page.goto("/integrations");
  await expect(page.getByRole("listitem", { name: "Linear" }).getByText("Connected", { exact: true })).toBeVisible();
});
