// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import { assertAiderBufferHidden, assertAiderBufferShown, assertAiderBufferString, sleep } from "./assertions.ts";
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
  await assertAiderBufferString(denops, "input: /add \n");
});

test("both", "AiderSilentRun should work", async (denops) => {
  // TODO if nothing is open, aider buffer is shown on the window(subtle bug)
  await denops.cmd("e hoge.txt"); // open a buffer
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferHidden(denops);
});
