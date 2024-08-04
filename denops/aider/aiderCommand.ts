import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";

export const aiderCommand = {
  async debug(denops: Denops): Promise<void> {
    await denops.cmd("b#");
  },

  async run(denops: Denops): Promise<void> {
    const aiderCommand = ensure(
      await v.g.get(denops, "aider_command"),
      is.String,
    );
    await denops.cmd(`terminal ${aiderCommand}`);
  },
};
