import { testFloating, testVsplit } from "./testUtil.ts";

testFloating("AiderRun should work with floating", async (denops) => {
  await denops.cmd("AiderRun");
});

testVsplit("AiderRun should work with buffer", async (denops) => {
  await denops.cmd("AiderRun");
});

testFloating(
  "AiderAddCurrentFile should work with floating",
  async (denops) => {
    await denops.cmd("AiderAddCurrentFile");
  },
);
testVsplit("AiderAddCurrentFile should work with buffer", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
});
