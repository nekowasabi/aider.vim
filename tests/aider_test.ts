// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import { assertAiderBufferHidden, assertAiderBufferShown, assertAiderBufferString, sleep } from "./assertions.ts";
import { assertAiderBufferAlive } from "./assertions.ts";
import { test } from "./testRunner.ts";

test("floating", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(100);
  await assertAiderBufferShown(denops);
});

test("vsplit", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(100);
  await assertAiderBufferShown(denops);
});

test("floating", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
  await sleep(100);
  await assertAiderBufferAlive(denops);
  await assertAiderBufferString(denops, "input: /add \n");
});

test("vsplit", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
  await sleep(100);
  await assertAiderBufferAlive(denops);
  await assertAiderBufferString(denops, "input: /add \n");
});

test("floating", "AiderSilentRun should work", async (denops) => {
  // TODO if nothing is open, aider buffer is shown on the window(subtle bug)
  await denops.cmd("e hoge.txt"); // open a buffer
  await denops.cmd("AiderSilentRun");
  await sleep(10);
  await assertAiderBufferHidden(denops);
});
test("vsplit", "AiderSilentRun should work", async (denops) => {
  // TODO if nothing is open, aider buffer is shown on the window(subtle bug)
  await denops.cmd("e hoge.txt"); // open a buffer
  await denops.cmd("AiderSilentRun");
  await sleep(10);
  await assertAiderBufferHidden(denops);
});
