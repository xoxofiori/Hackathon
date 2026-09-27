import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Each test starts from the built-in sample (browser storage is per test context).
  await page.goto("/");
});

test("home: greeting, big New Meeting button, recent meeting cards open the meeting page", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Good (morning|afternoon|evening), Maya$/);
  const cta = page.getByRole("link", { name: /New Meeting/ }).first();
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box!.height).toBeGreaterThan(120);
  for (const nav of ["Home", "Meetings", "Commitments", "Settings"]) {
    await expect(page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: nav })).toBeVisible();
  }
  await page.getByRole("link", { name: /Budget & deliverables sign-off/ }).click();
  await expect(page).toHaveURL(/\/meetings\/m3$/);
  for (const h of ["Summary", "Decisions", "Action Items", "Open Questions"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
});

test("meeting page: chips highlight transcript and notes, timestamps scroll, custom keywords, View Analysis", async ({ page }) => {
  await page.goto("/meetings/m3");
  const deadlines = page.getByRole("button", { name: /^Deadlines · \d+$/ });
  await expect(deadlines).toHaveText("Deadlines · 6");
  await deadlines.click();
  await expect(deadlines).toHaveAttribute("aria-pressed", "true");
  const transcript = page.getByRole("region", { name: "Transcript" });
  const notes = page.getByRole("region", { name: "Meeting notes" });
  await expect(transcript.locator("mark").first()).toBeVisible();
  await expect(notes.locator("mark").first()).toBeVisible();
  await expect(transcript.locator("mark", { hasText: "by spring" })).toHaveCount(1);

  const moments = page.getByRole("list", { name: "Moments in the transcript" }).getByRole("button");
  await expect(moments).toHaveCount(6);
  await moments.nth(1).click();
  await expect(transcript.locator("li.animate-flash")).toHaveCount(1);
  await expect(transcript.locator("li.animate-flash")).toContainText("footage by spring");

  await page.getByLabel("Add a custom keyword filter").fill("Geneva");
  await page.getByLabel("Add a custom keyword filter").press("Enter");
  const geneva = page.getByRole("button", { name: /^Geneva · \d+$/ });
  await expect(geneva).toHaveAttribute("aria-pressed", "true");
  await expect(notes.locator("mark", { hasText: "Geneva" }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /^Geneva · \d+$/ })).toBeVisible(); // custom chips persist

  await page.getByRole("link", { name: "View Analysis" }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: "Clarification queue" })).toBeVisible();
});

test("new meeting: sample transcript → loading → meeting page", async ({ page }) => {
  await page.getByRole("link", { name: /New Meeting/ }).first().click();
  await expect(page).toHaveURL(/\/meetings\/new$/);
  await page.getByRole("button", { name: "Use sample meeting" }).click();
  await expect(page.getByLabel("Meeting name")).toHaveValue("Budget & deliverables sign-off");
  await expect(page.getByLabel("Transcript")).toHaveValue(/Luca Brunner: It would be nice to have the footage by spring/);
  await page.getByRole("button", { name: "Create meeting notes" }).click();
  await expect(page.getByRole("status")).toContainText("Writing notes");
  await expect(page).toHaveURL(/\/meetings\/mtg-/);
  await expect(page.getByText("Sample notes")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Owners · \d+$/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "View Analysis" })).toHaveAttribute("href", "/demo");
  await page.getByRole("link", { name: "Home" }).first().click();
  await expect(page.getByRole("link", { name: /Budget & deliverables sign-off/ })).toHaveCount(2);
});

test("new meeting: a pasted transcript gets basic notes without an API key", async ({ page }) => {
  await page.goto("/meetings/new");
  await page.getByLabel("Meeting name").fill("Q3 launch sync");
  await page.getByLabel("Transcript").fill(
    ["Ana Costa: Can we ship the beta by Friday?", "Ben Okoye: We'll try, but the API work might slip.", "Ana Costa: I'll send the release notes by next week.", "Ben Okoye: Unfortunately we can't include SSO in the beta."].join("\n"),
  );
  await page.getByRole("button", { name: "Create meeting notes" }).click();
  await expect(page.getByRole("heading", { name: "Q3 launch sync" })).toBeVisible();
  await expect(page.getByText("Basic notes", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pushback · 2" })).toBeVisible(); // "Unfortunately" + "can't"
  await expect(page.getByRole("button", { name: "Soft yes · 1" })).toBeVisible(); // "We'll try"
  await expect(page.getByRole("button", { name: "View Analysis" })).toBeDisabled();
});

test("new meeting: audio upload explains the missing key and offers the sample", async ({ page }) => {
  await page.goto("/meetings/new");
  await page.getByRole("tab", { name: "Upload audio" }).click();
  await page.getByLabel("Audio file").setInputFiles({ name: "call.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("fake") });
  await page.getByRole("button", { name: "Create meeting notes" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Audio transcription" })).toContainText("DEEPGRAM_API_KEY");
  await page.getByRole("button", { name: "Use the sample meeting instead" }).click();
  await expect(page.getByLabel("Transcript")).toHaveValue(/Maya Chen/);
});

test("mobile: notes and transcript tabs, timestamp jumps to the transcript", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/meetings/m3");
  await expect(page.getByRole("region", { name: "Meeting notes" })).toBeVisible();
  await page.getByRole("button", { name: /^Pushback · \d+$/ }).click();
  await page.getByRole("list", { name: "Moments in the transcript" }).getByRole("button").first().click();
  await expect(page.getByRole("region", { name: "Transcript" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Meeting notes" })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
