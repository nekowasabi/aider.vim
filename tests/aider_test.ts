import { testBuffer, testFloating } from "./testUtil.ts";

testFloating("AiderRun should work with floating", async (denops) => {
  await denops.cmd("AiderRun");
});

testBuffer("AiderRun should work with buffer", async (denops) => {
  await denops.cmd("AiderRun");
});

testFloating(
  "AiderAddCurrentFile should work with floating",
  async (denops) => {
    await denops.cmd("AiderAddCurrentFile");
  },
);
testBuffer("AiderAddCurrentFile should work with buffer", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
});
