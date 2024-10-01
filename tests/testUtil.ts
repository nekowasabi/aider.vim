import { fromFileUrl } from "https://deno.land/std@0.217.0/path/mod.ts";
import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { BufferLayout } from "../denops/aider/buffer.ts";
import { test } from "jsr:@denops/test";

async function setup(denops: Denops, bufferLayout: BufferLayout) {
  const runtimepath = fromFileUrl(import.meta.resolve("../"));
  await denops.cmd(`set runtimepath^=${runtimepath}`);
  await denops.cmd("call denops#plugin#discover()");
  await denops.cmd(
    `let g:aider_command = "${runtimepath}tests/mockServer.ts"`,
  );
  await denops.cmd(`let g:aider_buffer_open_type = "${bufferLayout}"`);
  const sleep = (msec: number) =>
    new Promise((resolve) => setTimeout(resolve, msec));
  await sleep(10); // sleepを入れないとAiderAddCurrentFileが落ちた。mainのロードが間に合っていない？
}

export function testFloating(
  testName: string,
  fn: (denops: Denops) => Promise<void>,
) {
  test("nvim", testName, async (denops) => {
    await setup(denops, "floating");
    await fn(denops);
  });
}
export function testVsplit(
  testName: string,
  fn: (denops: Denops) => Promise<void>,
) {
  test("nvim", testName, async (denops) => {
    await setup(denops, "vsplit");
    await fn(denops);
  });
}
