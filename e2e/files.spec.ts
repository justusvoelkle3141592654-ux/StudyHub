import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

test.describe("files", () => {
  test("imports a text file, previews it and links it to a note", async ({ page }) => {
    await completeSetup(page, { subjects: ["Physik"] });
    await page.goto("/#/files");
    const chooser = page.waitForEvent("filechooser");
    await page.getByTestId("file-import").click();
    await (await chooser).setFiles({ name: "formeln.txt", mimeType: "text/plain", buffer: Buffer.from("E = m c^2\nF = m a\n") });
    await expect(page.getByTestId("file-item")).toHaveCount(1);
    await expect(page.getByTestId("file-item")).toContainText("formeln.txt");
    await page.getByTestId("file-item").getByRole("button", { name: /formeln.txt/ }).first().click();
    await expect(page.getByRole("region", { name: "Vorschau" })).toContainText("E = m c^2");
    await expect(page.getByRole("region", { name: "Vorschau" })).toContainText("SHA-256");

    // Link the file to a note.
    await page.goto("/#/notes");
    await page.getByTestId("note-add").click();
    await page.getByRole("button", { name: "Dateien verknüpfen" }).click();
    await page.getByRole("checkbox").first().click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Dateien verknüpfen" })).toContainText("1");
  });
});
