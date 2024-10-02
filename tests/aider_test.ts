import { test } from "./testUtil.ts";

test("floating", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
});

test("vsplit", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
});

test("floating", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
});

test("vsplit", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
});
