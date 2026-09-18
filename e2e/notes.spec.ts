import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

test.describe("notes", () => {
  test("creates a note with live preview, tags and full-text search", async ({ page }) => {
    await completeSetup(page);
    await page.goto("/#/notes");
    await page.getByTestId("note-add").click();
    await expect(page).toHaveURL(/#\/notes\/[0-9a-f-]+/);
    await page.getByTestId("note-title").fill("Photosynthese");
    await page.getByTestId("note-content").fill("# Ablauf\n\nChlorophyll absorbiert **Licht**.\n\n- Lichtreaktion\n- Dunkelreaktion");
    await expect(page.getByTestId("note-preview").getByRole("heading", { name: "Ablauf" })).toBeVisible();
    await expect(page.getByTestId("note-preview").locator("strong")).toHaveText("Licht");
    await page.getByTestId("tag-input").fill("bio");
    await page.getByTestId("tag-input").press("Enter");
    await expect(page.getByText(/Gespeichert/)).toBeVisible();

    // Second note, then search for the first one.
    await page.getByTestId("note-add").click();
    await page.getByTestId("note-title").fill("Anderes Thema");
    await expect(page.getByText(/Gespeichert/)).toBeVisible();
    await expect(page.getByTestId("note-item")).toHaveCount(2);
    await page.getByTestId("note-search").fill("chlorophyll");
    await expect(page.getByTestId("note-item")).toHaveCount(1);
    await expect(page.getByTestId("note-item")).toContainText("Photosynthese");
    await page.getByTestId("note-search").fill("");
    await page.getByRole("button", { name: "#bio" }).click();
    await expect(page.getByTestId("note-item")).toHaveCount(1);
  });
});
