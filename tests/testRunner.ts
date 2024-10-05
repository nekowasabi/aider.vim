import { test as denopsTest } from "jsr:@denops/test";
import { fromFileUrl } from "https://deno.land/std@0.217.0/path/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import type { BufferLayout } from "../denops/aider/bufferOperation.ts";

async function setup(denops: Denops, bufferLayout: BufferLayout) {
  const runtimepath = fromFileUrl(import.meta.resolve("../"));
  await denops.cmd(`set runtimepath^=${runtimepath}`);
  await denops.cmd("call denops#plugin#discover()");
  await denops.cmd(`let g:aider_command = "${runtimepath}tests/mockServer.ts"`);
  await denops.cmd(`let g:aider_buffer_open_type = "${bufferLayout}"`);
  await sleep(10); // sleepを入れないとAiderAddCurrentFileが落ちた。mainのロードが間に合っていない？
}

export function test(
  mode: "floating" | "vsplit",
  testName: string,
  fn: (denops: Denops) => Promise<void>,
) {
  denopsTest("nvim", `(${mode}): ${testName}`, async (denops) => {
    await setup(denops, mode);
    await sleep(10);
    await fn(denops);
  });
}
const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));
