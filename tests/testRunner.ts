import { test as denopsTest } from "jsr:@denops/test";
import { fromFileUrl } from "https://deno.land/std@0.217.0/path/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as aider from "../denops/aider/aiderCommand.ts";
import type { BufferLayout } from "../denops/aider/bufferOperation.ts";
import { main } from "../denops/aider/main.ts";

async function setup(denops: Denops, bufferLayout: BufferLayout) {
  const runtimepath = fromFileUrl(import.meta.resolve("../"));
  aider.setTestMode();
  await denops.cmd(`set runtimepath^=${runtimepath}`);
  await denops.cmd(
    `let g:aider_command = "${runtimepath}tests/mockServer.ts"`,
  );
  await denops.cmd(`let g:aider_buffer_open_type = "${bufferLayout}"`);
  await denops.cmd("let g:aider_floatwin_height = 50");
  await denops.cmd("let g:aider_floatwin_width = 50");
  await main(denops);
  await sleep(10); // sleepを入れないとAiderAddCurrentFileが落ちた。mainのロードが間に合っていない？
}

export function test(
  mode: "both" | "floating" | "vsplit",
  testName: string,
  fn: (denops: Denops) => Promise<void>,
) {
  if (mode === "both") {
    test("floating", testName, fn);
    test("vsplit", testName, fn);
    return;
  }

  denopsTest("nvim", `(${mode}): ${testName}`, async (denops) => {
    await setup(denops, mode);
    await fn(denops);
  });
}
const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));
