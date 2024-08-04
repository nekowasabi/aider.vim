import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";

export const aiderCommand = {
  async debug(denops: Denops): Promise<void> {
    await denops.cmd("b#");
  },
};
