import { test } from "jsr:@denops/test";

test("nvim", "AiderRun should work", async (denops) => {
  await denops.cmd('let g:aider_command = "mockServer.ts"');
  await denops.cmd('let g:aider_buffer_open_type = "floating"');
  await denops.cmd("AiderRun");

  //  AiderRun should work ... FAILED (131ms)
  //
  //   ERRORS
  //
  //  AiderRun should work => https://jsr.io/@denops/test/3.0.4/tester.ts:148:10
  //  error: Error: Failed to call 'denops#api#cmd' in Neovim: function denops#api#cmd, line 2: Vim:E492: エディタのコマンドではありません: AiderRun (code: 0)
  //      at <anonymous> (ext:core/01_core.js:778:34)
  //
  //   FAILURES
  //
  //  AiderRun should work => https://jsr.io/@denops/test/3.0.4/tester.ts:148:10
  //
  //  FAILED | 0 passed | 1 failed (133ms)
  //
  //  error: Test failed
});
