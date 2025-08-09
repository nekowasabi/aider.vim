// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import {
  assertAiderBufferHidden,
  assertAiderBufferShown,
  assertAiderBufferString,
  sleep,
} from "./assertions.ts";
import { assertAiderBufferAlive } from "./assertions.ts";
import { test } from "./testRunner.ts";

const SLEEP_BEFORE_ASSERT = 100;

test("both", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferShown(denops);
});

test("both", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  await assertAiderBufferString(denops, "input: /add ");
});

test("both", "AiderSilentRun should work", async (denops) => {
  // TODO if nothing is open, aider buffer is shown on the window(subtle bug)
  await denops.cmd("e hoge.txt"); // open a buffer
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferHidden(denops);
});

test(
  "both",
  "AiderAddBuffers should return empty for files not under git management",
  async (denops) => {
    await denops.cmd("AiderRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("AiderAddBuffers");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferAlive(denops);
    await assertAiderBufferString(denops, "input: /add ");
  },
);

test(
  "floating",
  "AiderAddBuffers should return /add `bufferName` if there is a buffer under git management",
  async (denops) => {
    await denops.cmd("AiderRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    ""; // Ensure we are not in the Aider window when opening a file
    await denops.cmd("silent! wincmd p");
    await denops.cmd("e ./tests/aider_test.ts");
    // Ensure aider buffer is alive after switching buffers/windows
    await denops.cmd("AiderRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("AiderAddBuffers");
    await sleep(SLEEP_BEFORE_ASSERT);
    // Extra wait for vsplit path where window operations can delay buffer writes
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferString(
      denops,
      "input: /add tests/aider_test.ts",
    );
  },
);

test("both", "AiderSendPromptByCommandline should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  await sleep(SLEEP_BEFORE_ASSERT);
  await denops.cmd("AiderSendPromptByCommandline test");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferString(denops, "input: test");
});

test(
  "both",
  "AiderSilentSendPromptByCommandline should work",
  async (denops) => {
    await denops.cmd("AiderSilentRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferAlive(denops);
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("AiderSilentSendPromptByCommandline silent test");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferString(denops, "input: silent test");
  },
);
