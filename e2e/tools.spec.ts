import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

test.describe("science tools", () => {
  test("unit converter, formulas, calculator and periodic table", async ({ page }) => {
    await completeSetup(page);
    await page.goto("/#/tools/units");
    await page.getByTestId("unit-value").fill("100");
    await expect(page.getByTestId("unit-result")).toContainText("10"); // 100 mm = 10 cm
    await page.getByTestId("tool-formulas").click();
    await page.getByTestId("formula-search").fill("ohm");
    await expect(page.getByTestId("formula-list").locator("li")).toHaveCount(1);
    await expect(page.getByTestId("formula-list").locator(".katex")).toBeVisible();
    await page.getByTestId("tool-calculator").click();
    await page.getByTestId("calc-input").fill("2^10 + sqrt(16)");
    await page.getByTestId("calc-input").press("Enter");
    await expect(page.getByTestId("calc-history")).toContainText("= 1028");
    await page.getByTestId("tool-elements").click();
    await page.getByTestId("element-Fe").click();
    await expect(page.getByTestId("element-detail")).toContainText("[Ar] 3d6 4s2");
    await expect(page.getByRole("dialog")).toContainText("Eisen");
  });
});
