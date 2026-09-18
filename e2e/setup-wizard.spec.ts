import { expect, test } from "@playwright/test";
import { completeSetup, nextStep } from "./helpers";

test.describe("setup wizard", () => {
  test("redirects to the wizard on first start and walks through all 15 steps", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/#\/setup/);
    await expect(page.getByTestId("setup-step-indicator")).toHaveText("Schritt 1 von 15");

    // Language switch applies immediately.
    await page.getByTestId("option-en").click();
    await expect(page.getByTestId("setup-step-indicator")).toHaveText("Step 1 of 15");
    await page.getByTestId("option-de").click();

    await nextStep(page, 2);
    await page.getByTestId("option-school").click();
    await nextStep(page, 3);
    await expect(page.getByTestId("option-local")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("option-cloud")).toBeDisabled();
    await nextStep(page, 4);
    await expect(page.getByTestId("setup-step-4")).toContainText("Offline-Modus");
    await nextStep(page, 5);
    await nextStep(page, 6);
    await nextStep(page, 7);
    await page.getByRole("button", { name: "Mathematik" }).click();
    await page.getByTestId("subject-name").fill("Kunst");
    await page.getByTestId("subject-name").press("Enter");
    await expect(page.getByRole("list", { name: "Fächer" })).toContainText("Kunst");
    await page.getByTestId("setup-back").click();
    await page.getByTestId("setup-step-6").waitFor();
    for (let step = 6; step < 15; step++) await nextStep(page, step + 1);
    await expect(page.getByTestId("setup-step-indicator")).toHaveText("Schritt 15 von 15");
    await expect(page.getByTestId("setup-step-15")).toContainText("Mathematik, Kunst");

    // Jump back from the summary and return.
    await page.getByRole("button", { name: "Bearbeiten: Nutzungsprofil" }).click();
    await expect(page.getByTestId("setup-step-2")).toBeVisible();
    await page.getByTestId("setup-skip").click();
    await page.getByTestId("setup-finish").click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Startseite");

    // Setup is persisted across reloads.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Startseite");
  });

  test("'set up later' jumps to the summary with defaults", async ({ page }) => {
    await page.goto("/#/setup");
    await page.getByTestId("setup-skip").click();
    await expect(page.getByTestId("setup-step-15")).toBeVisible();
    await completeSetup(page);
  });
});
