import { expect, test } from "@playwright/test";
import { completeSetup, waitForPersistence } from "./helpers";

test.describe("office documents", () => {
  test("text document: typing, formatting, footnote and persistence", async ({ page }) => {
    await completeSetup(page);
    await page.goto("/#/documents");
    await page.getByTestId("doc-new").click();
    await page.getByTestId("doc-new-text").click();
    await expect(page).toHaveURL(/#\/documents\/[0-9a-f-]+/);
    const editor = page.locator(".ProseMirror-editor");
    await editor.click();
    await page.keyboard.type("Hallo Welt");
    await page.getByRole("button", { name: "Fett" }).click();
    await page.keyboard.type(" fett");
    await page.getByRole("button", { name: "Fußnote" }).click();
    await page.getByTestId("prompt-value").fill("Quelle");
    await page.getByTestId("prompt-submit").click();
    await expect(editor.locator("strong")).toHaveText(" fett");
    await expect(editor.locator("sup.footnote-ref")).toHaveCount(1);
    await expect(page.getByText(/Wörter|Wort/)).toBeVisible();
    await expect(page.getByText(/Gespeichert/)).toBeVisible();
    await page.getByTestId("doc-title").fill("Mein Aufsatz");
    await page.getByTestId("doc-title").press("Enter");
    await waitForPersistence(page);

    await page.reload();
    await expect(page.locator(".ProseMirror-editor")).toContainText("Hallo Welt fett");
    await page.goto("/#/documents");
    await expect(page.getByTestId("doc-item")).toContainText("Mein Aufsatz");
  });

  test("presentation: slides, elements, notes and presenter", async ({ page }) => {
    await completeSetup(page);
    await page.goto("/#/documents");
    await page.getByTestId("doc-new").click();
    await page.getByTestId("doc-new-presentation").click();
    await expect(page.getByTestId("slide-thumb")).toHaveCount(1);
    await page.getByTestId("slide-add").click();
    await page.getByTestId("layout-twoColumns").click();
    await expect(page.getByTestId("slide-thumb")).toHaveCount(2);
    await page.getByTestId("slide-notes").fill("Notiz für Folie 2");

    // Select the first element on the current slide and change its text.
    const canvasElement = page.locator("[role=group] [data-testid=slide-element]").first();
    await canvasElement.click();
    await page.getByTestId("element-text").fill("Agenda");
    await expect(page.locator("[role=group]")).toContainText("Agenda");

    await page.getByTestId("present").click();
    await expect(page.getByTestId("presenter")).toBeVisible();
    await expect(page.getByTestId("presenter-index")).toHaveText("2 / 2");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByTestId("presenter-index")).toHaveText("1 / 2");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("presenter")).toHaveCount(0);
    await expect(page.getByText(/Gespeichert/)).toBeVisible();
    await waitForPersistence(page);

    await page.reload();
    await expect(page.getByTestId("slide-thumb")).toHaveCount(2);
  });
});
