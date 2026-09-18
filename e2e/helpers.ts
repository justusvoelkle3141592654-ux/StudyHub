import type { Page } from "@playwright/test";

/** Click "next" and wait for the given step to be shown. */
export async function nextStep(page: Page, expectedStep: number) {
  await page.getByTestId("setup-next").click();
  await page.getByTestId(`setup-step-${expectedStep}`).waitFor();
}

/** Walk through the wizard with defaults, optionally adding subjects. */
export async function completeSetup(page: Page, options: { subjects?: string[] } = {}) {
  await page.goto("/#/setup");
  // A hash-only navigation keeps the in-memory wizard state; reload to start from step 1.
  await page.reload();
  await page.getByTestId("setup-step-1").waitFor();
  for (let step = 1; step < 15; step++) {
    if (step === 7 && options.subjects?.length) {
      for (const s of options.subjects) {
        await page.getByTestId("subject-name").fill(s);
        await page.getByTestId("subject-name").press("Enter");
      }
    }
    await nextStep(page, step + 1);
  }
  await page.getByTestId("setup-finish").click();
  await page.waitForURL(/#\/$/);
}
