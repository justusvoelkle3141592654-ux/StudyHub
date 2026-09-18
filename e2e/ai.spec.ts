import { expect, test } from "@playwright/test";
import { completeSetup } from "./helpers";

/** Minimal Anthropic Messages streaming response (SSE) for the mocked API. */
function sseResponse(text: string): string {
  const events: Array<[string, unknown]> = [
    ["message_start", { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
    ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } }],
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 5 } }],
    ["message_stop", { type: "message_stop" }],
  ];
  return events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");
}

test.describe("AI features (optional)", () => {
  test("buttons are hidden without a key and appear after storing one; request shows a preview and streams", async ({ page }) => {
    await completeSetup(page);
    await page.goto("/#/notes");
    await page.getByTestId("note-add").click();
    await page.getByTestId("note-title").fill("Zellatmung");
    await page.getByTestId("note-content").fill("Die Zellatmung findet in den Mitochondrien statt.");
    await expect(page.getByTestId("note-ai")).toHaveCount(0);

    // Store a key in the settings (browser build keeps it in sessionStorage only).
    await page.goto("/#/settings");
    await page.getByTestId("ai-key").fill("sk-ant-test-key");
    await page.getByTestId("ai-key-save").click();
    await expect(page.getByTestId("ai-enable")).toHaveAttribute("aria-checked", "true");

    // Mock the Anthropic API and check the header the SDK sends from a browser context.
    let sentBody: Record<string, unknown> | null = null;
    let browserHeader: string | undefined;
    await page.route("https://api.anthropic.com/v1/messages", async (route) => {
      sentBody = route.request().postDataJSON() as Record<string, unknown>;
      browserHeader = route.request().headers()["anthropic-dangerous-direct-browser-access"];
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: sseResponse("**Kurz:** Zellatmung liefert ATP.") });
    });

    await page.goto("/#/notes");
    await page.getByTestId("note-item").first().click();
    await page.getByTestId("note-ai").click();
    await page.getByRole("menuitem", { name: "Notiz zusammenfassen" }).click();
    await expect(page.getByTestId("ai-preview")).toContainText("Die Zellatmung findet in den Mitochondrien statt.");
    await page.getByTestId("ai-send").click();
    await expect(page.getByTestId("ai-result")).toContainText("Zellatmung liefert ATP.");
    expect(browserHeader).toBe("true");
    expect(sentBody?.model).toBe("claude-opus-5");
    expect(sentBody?.stream).toBe(true);
    await page.getByTestId("ai-apply").click();
    await expect(page.getByTestId("note-content")).toHaveValue(/Zusammenfassung \(KI\)/);

    // Switching the feature off hides the buttons again.
    await page.goto("/#/settings");
    await page.getByTestId("ai-enable").click();
    await page.goto("/#/notes");
    await page.getByTestId("note-item").first().click();
    await expect(page.getByTestId("note-ai")).toHaveCount(0);
  });
});
