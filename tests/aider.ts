import { assert, assertEquals, assertFalse } from "jsr:@std/assert";
import { test } from "jsr:@denops/test";
import { getCurrentFilePath } from "../denops/aider/utils.ts";

test("vim", "Start Vim to test denops features", async (denops) => {
  const path = await getCurrentFilePath(denops);
  assertEquals(path, "aaaaaaaaaaaaa");
});
