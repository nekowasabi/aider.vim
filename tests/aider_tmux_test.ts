import { test } from "./testRunner.ts";
import { sleep } from "./assertions.ts";
import { assertAiderBufferAlive, assertAiderBufferString } from "./assertions.ts";

const SLEEP = 100;

// Simulate tmux presence via $TMUX and verify behavior under vsplit layout
// We avoid calling commands that invoke external tmux binaries in tests.

test("vsplit", "tmux: AiderAddBuffers with file under git management", async (denops) => {
  // Simulate tmux environment for code paths that check exists('$TMUX')
  await denops.cmd("let $TMUX = '1'");

  await denops.cmd("AiderRun");
  await sleep(SLEEP);
  await assertAiderBufferAlive(denops);

  // Ensure we are not in the Aider window when opening a file
  await denops.cmd("silent! wincmd p");
  await denops.cmd("e ./tests/aider_test.ts");

  // Ensure aider buffer is alive
  await denops.cmd("AiderRun");
  await sleep(SLEEP);

  await denops.cmd("AiderAddBuffers");
  await sleep(SLEEP);
  // In tmux mode, prompts are handled differently; just assert no error and buffer alive
  await assertAiderBufferAlive(denops);
});

test("vsplit", "tmux: AiderSendPromptByCommandline should work", async (denops) => {
  await denops.cmd("let $TMUX = '1'");

  await denops.cmd("AiderRun");
  await sleep(SLEEP);
  await assertAiderBufferAlive(denops);

  // Simulate that an aider tmux pane is active without invoking tmux binaries
  await denops.cmd("let g:aider_tmux_pane_id = '%%pane%%'");

  await denops.cmd("AiderSendPromptByCommandline tmux_prompt");
  await sleep(SLEEP);
  await assertAiderBufferString(denops, "input: tmux_prompt");
});

test("vsplit", "tmux: AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("let $TMUX = '1'");

  await denops.cmd("AiderRun");
  await sleep(SLEEP);
  await assertAiderBufferAlive(denops);

  // Ensure we are not in the Aider window when opening a file
  await denops.cmd("silent! wincmd p");
  await denops.cmd("e ./tests/aider_test.ts");

  // Simulate that an aider tmux pane is active without invoking tmux binaries
  await denops.cmd("let g:aider_tmux_pane_id = '%%pane%%'");

  await denops.cmd("AiderAddCurrentFile");
  await sleep(SLEEP);
  // Just ensure no error and buffer remains alive in tmux mode
  await assertAiderBufferAlive(denops);
});
