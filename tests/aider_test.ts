import { test } from "jsr:@denops/test";

test("nvim", "AiderRun should work", async (denops) => {
  await denops.cmd('source "setting.vim"');
  await denops.cmd('let g:aider_command = "mockServer.ts"');
  await denops.cmd("AiderRun");
});
