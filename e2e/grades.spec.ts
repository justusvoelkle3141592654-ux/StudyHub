import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

test.describe("grades", () => {
  test("adds grades, shows averages and the target calculator", async ({ page }) => {
    await completeSetup(page, { subjects: ["Mathematik"] });
    await page.goto("/#/grades");
    await page.getByTestId("grade-add").click();
    await page.getByTestId("grade-title").fill("Klausur 1");
    await page.getByTestId("grade-value").fill("2,0");
    await page.getByTestId("grade-save").click();
    await page.getByTestId("grade-add").click();
    await page.getByTestId("grade-title").fill("Test");
    await page.getByTestId("grade-value").fill("3,0");
    await page.getByTestId("grade-save").click();
    await expect(page.getByTestId("grades-overall")).toHaveText("2,5");

    await page.getByTestId("grade-subject-row").click();
    await expect(page.getByTestId("grade-item")).toHaveCount(2);
    await page.getByTestId("target-input").fill("2,0");
    await expect(page.getByTestId("target-result")).toContainText("1,0");
    await page.getByTestId("target-input").fill("1,0");
    await expect(page.getByTestId("target-result")).toContainText("Nicht erreichbar");
  });
});
