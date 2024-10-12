// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import { assertAiderBufferString, sleep } from "./assertions.ts";
import { assertAiderBufferAlive } from "./assertions.ts";
import { test } from "./testRunner.ts";

test("floating", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(10);
  await assertAiderBufferAlive(denops);
});

test("vsplit", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(10);
  await assertAiderBufferAlive(denops);
});

test("floating", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
  await sleep(10);
  await assertAiderBufferAlive(denops);
  await assertAiderBufferString(denops, "input: /add \n");
});

test("vsplit", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
  await sleep(10);
  await assertAiderBufferAlive(denops);
  await assertAiderBufferString(denops, ""); // "Run Command again." messgae is shown
});
