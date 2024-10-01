import { testFloating, testVsplit } from "./testUtil.ts";

testFloating("AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
});

testVsplit("AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
});

testFloating(
  "AiderAddCurrentFile should work",
  async (denops) => {
    await denops.cmd("AiderAddCurrentFile");
  },
);
testVsplit("AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
});
