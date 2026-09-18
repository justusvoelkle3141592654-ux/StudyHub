import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

test.describe("tasks", () => {
  test("creates, completes and filters a task", async ({ page }) => {
    await completeSetup(page, { subjects: ["Mathematik"] });
    await page.goto("/#/tasks");
    await expect(page.getByTestId("task-add")).toBeVisible();
    await page.getByTestId("task-add").click();
    await page.getByTestId("task-title").fill("Übungsblatt 3");
    await page.getByTestId("task-due").fill("2030-05-01T10:00");
    await page.getByTestId("task-save").click();
    await expect(page.getByTestId("task-item")).toHaveCount(1);
    await expect(page.getByTestId("task-item")).toContainText("Übungsblatt 3");
    await expect(page.getByRole("heading", { name: /Später/ })).toBeVisible();

    // Complete it: disappears from the open list, shows up under "done".
    await page.getByRole("checkbox", { name: /Übungsblatt 3/ }).click();
    await expect(page.getByTestId("task-item")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Erledigt" }).click();
    await expect(page.getByTestId("task-item")).toHaveCount(1);

    // Survives a reload (persisted in the local database).
    await page.reload();
    await page.goto("/#/tasks");
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Alle" }).click();
    await expect(page.getByTestId("task-item")).toHaveCount(1);
  });

  test("timetable slot shows on the dashboard", async ({ page }) => {
    await completeSetup(page, { subjects: ["Biologie"] });
    await page.goto("/#/timetable");
    await page.getByTestId("timetable-add").click();
    // Preset: Monday, first lesson. Set weekday to today's weekday so it appears on the dashboard.
    const weekday = ((new Date().getDay() + 6) % 7) + 1;
    if (weekday <= 5) {
      await page.getByRole("combobox", { name: "Wochentag" }).click();
      await page.getByRole("option").nth(weekday - 1).click();
    }
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByTestId("timetable-slot")).toHaveCount(1);
    if (weekday <= 5) {
      await page.goto("/#/");
      await expect(page.getByTestId("dashboard-tiles")).toContainText("Biologie");
    }
  });
});
