import { expect, test, type Page } from "@playwright/test";

const sidebar = (page: Page) => page.getByRole("region", { name: "Groups" }).or(page.locator("section[aria-labelledby=groups-title]"));
const filter = (page: Page) => page.getByRole("group", { name: "Filter meetings by group" });
const cards = (page: Page) => page.locator("a[href^='/meetings/']").filter({ has: page.locator("h3") });

test("home: group tags on every card and filtering by group", async ({ page }) => {
  await page.goto("/");
  await expect(cards(page)).toHaveCount(6);
  await expect(cards(page).filter({ hasText: "Colour grade review" })).toContainText("Season 3 post-production");
  await filter(page).getByRole("button", { name: /Season 3 post-production/ }).click();
  await expect(cards(page)).toHaveCount(2);
  await page.getByRole("link", { name: "Open group →" }).click();
  await expect(page).toHaveURL(/\/groups\/g-post$/);
});

test("sidebar group page: meetings plus open commitments and upcoming deadlines", async ({ page }) => {
  await page.goto("/");
  await sidebar(page).getByRole("link", { name: /Streaming & distribution/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Streaming & distribution");
  await expect(page.getByRole("region", { name: "Open commitments" })).toContainText("Send avails and the rate card to Northlight+");
  await expect(page.getByRole("region", { name: "Upcoming deadlines" })).toContainText("In 4 days");
  await expect(cards(page)).toHaveCount(1);
  await page.goto("/groups/g-aurel");
  await expect(page.getByRole("region", { name: "Open commitments" })).toContainText("Watch prototypes for filming");
});

test("new meeting: accept the suggested group", async ({ page }) => {
  await page.goto("/meetings/new");
  await page.getByRole("button", { name: "Use sample meeting" }).click();
  await page.getByRole("button", { name: "Create meeting notes" }).click();
  await expect(page.getByRole("status")).toContainText("Suggesting a group");
  const suggestion = page.getByRole("region", { name: "Suggested group" });
  await expect(suggestion).toContainText("Aurel sponsorship");
  await suggestion.getByRole("button", { name: "Add to Aurel sponsorship" }).click();
  await expect(suggestion).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Group: Aurel sponsorship. Change group" })).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: /Aurel sponsorship/ })).toContainText("4");
});

test("new meeting: nothing fits, so a new group is suggested and created in one click", async ({ page }) => {
  await page.goto("/meetings/new");
  await page.getByLabel("Meeting name").fill("Co-production call");
  await page.getByLabel("Transcript").fill([
    "Ana Costa: Kestrel Films wants to co-produce a nature special for next year.",
    "Ben Okoye: Kestrel Films has a strong team in Cape Town.",
    "Ana Costa: Let's ask Kestrel Films for a proposal by Friday.",
  ].join("\n"));
  await page.getByRole("button", { name: "Create meeting notes" }).click();
  const suggestion = page.getByRole("region", { name: "Suggested group" });
  await expect(suggestion).toContainText("Suggested new group");
  await suggestion.getByRole("button", { name: "Create “Kestrel Films”" }).click();
  await expect(sidebar(page).getByRole("link", { name: /Kestrel Films/ })).toContainText("1");
  await expect(page.getByRole("button", { name: "Group: Kestrel Films. Change group" })).toBeVisible();
});

test("pick a different group, or create your own from the picker", async ({ page }) => {
  await page.goto("/meetings/d1");
  await page.getByRole("button", { name: "Group: Streaming & distribution. Change group" }).click();
  await page.getByRole("option", { name: "Season 3 post-production" }).click();
  await expect(page.getByRole("button", { name: "Group: Season 3 post-production. Change group" })).toBeVisible();
  await page.getByRole("button", { name: "Group: Season 3 post-production. Change group" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "New group" }).click();
  await page.getByLabel("New group name").fill("Northlight+ deal");
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page.getByRole("button", { name: "Group: Northlight+ deal. Change group" })).toBeVisible();
});

test("rename, recolor and delete a group; its meetings become unsorted", async ({ page }) => {
  await page.goto("/groups/g-dist");
  await page.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel("Group name").fill("Distribution deals");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Distribution deals");
  await page.getByRole("radio", { name: "Color #be123c" }).click();
  await expect(page.getByRole("radio", { name: "Color #be123c" })).toHaveAttribute("aria-checked", "true");
  await expect(sidebar(page).getByRole("link", { name: /Distribution deals/ })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(sidebar(page).getByRole("link", { name: /Distribution deals/ })).toHaveCount(0);
  await filter(page).getByRole("button", { name: /Unsorted/ }).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText("Streaming rights intro: Northlight+");
});

test("create a group from the sidebar", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a group" }).click();
  await page.getByLabel("New group name").fill("Kestrel co-production");
  await page.getByLabel("New group name").press("Enter");
  await expect(page).toHaveURL(/\/groups\/g-kestrel-co-production/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kestrel co-production");
  await expect(page.getByText("No meetings here yet.", { exact: false })).toBeVisible();
});
