import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import { getAiderBufferNr } from "./utils.ts";

export class Command {
  constructor(private denops: Denops) {
  }

  async exit(): Promise<void> {
    const bufnr = await getAiderBufferNr(this.denops);
    if (bufnr !== undefined) {
      await this.denops.cmd(`${bufnr}bdelete!`);
    }
  }
}
