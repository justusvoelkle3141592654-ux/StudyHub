import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

test.describe("flashcards", () => {
  test("creates a deck with cards and runs a study session", async ({ page }) => {
    await completeSetup(page);
    await page.goto("/#/flashcards");
    await page.getByTestId("deck-add").click();
    await page.getByTestId("deck-name").fill("Biologie");
    await page.getByTestId("deck-save").click();
    await expect(page).toHaveURL(/#\/flashcards\/[0-9a-f-]+$/);

    await page.getByTestId("card-add").click();
    await page.getByTestId("card-front").fill("Mitochondrium");
    await page.getByTestId("card-back").fill("Kraftwerk der Zelle");
    await page.getByTestId("card-save-another").click();
    await page.getByTestId("card-front").fill("Ribosom");
    await page.getByTestId("card-back").fill("Ort der **Proteinsynthese**");
    await page.getByTestId("card-save").click();
    await expect(page.getByTestId("card-item")).toHaveCount(2);

    await page.getByTestId("deck-study").click();
    await expect(page.getByTestId("study-session")).toBeVisible();
    await expect(page.getByTestId("card-back-shown")).toHaveCount(0);
    await page.getByTestId("reveal").click();
    await expect(page.getByTestId("card-back-shown")).toBeVisible();
    await page.getByTestId("grade-5").click();

    // Second card via keyboard: Space reveals, "1" marks a lapse and re-queues it.
    await page.keyboard.press("Space");
    await expect(page.getByTestId("card-back-shown")).toBeVisible();
    await page.keyboard.press("1");
    await expect(page.getByTestId("card-back-shown")).toHaveCount(0);
    await page.getByTestId("reveal").click();
    await page.getByTestId("grade-4").click();

    await expect(page.getByText("Sitzung abgeschlossen")).toBeVisible();
    await page.getByTestId("session-back").click();
    await expect(page.getByTestId("card-item")).toHaveCount(2);
    await expect(page.getByText("Lernstatistik")).toBeVisible();
    // Both cards are scheduled for tomorrow, so nothing is due any more.
    await expect(page.getByTestId("deck-study")).toContainText("(0)");
  });
});
