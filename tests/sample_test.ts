import { assert, assertEquals, assertFalse } from "jsr:@std/assert";
import { test } from "jsr:@denops/test";

test("vim", "Start Vim to test denops features", async (denops) => {
  assertFalse(await denops.call("has", "vim"));
});

test({
  mode: "nvim",
  name: "111111111 Start Neovim to test denops features",
  fn: async (denops) => {
    assert(await denops.call("has", "nvim"));
  },
});

test({
  mode: "all",
  name: "Start Vim and Neovim to test denops features",
  fn: async (denops) => {
    assertEquals(await denops.call("abs", -4), 4);
  },
});

test({
  mode: "any",
  name: "Start Vim or Neovim to test denops features",
  fn: async (denops) => {
    assertEquals(await denops.call("abs", -4), 4);
  },
});
