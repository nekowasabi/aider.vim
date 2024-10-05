// deno-lint-ignore-file require-await
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import type { AiderCommands } from "./aiderCommand.ts";
import { emit } from "https://deno.land/x/denops_std@v6.4.0/autocmd/mod.ts";

let mockAiderBufnr: number | undefined = undefined;

export const commands: AiderCommands = {
  run: async (denops: Denops): Promise<undefined> => {
    const newBuf = await fn.bufnr(denops, "dummyaider", true);
    await emit(denops, "User", "AiderOpen");
    mockAiderBufnr = newBuf;
  },

  silentRun: async function (denops: Denops): Promise<undefined> {
    await this.run(denops);
    await denops.cmd("b#"); // hide buffer
  },

  sendPrompt: async (
    denops: Denops,
    _jobId: number,
    prompt: string,
  ): Promise<undefined> => {
    await fn.feedkeys(denops, `input: ${prompt}\n`);
  },

  exit: async (denops: Denops): Promise<undefined> => {
    if (mockAiderBufnr === undefined) {
      return;
    }

    await fn.bufnr(denops, mockAiderBufnr.toString(), true);
    await denops.cmd("bd!");
  },

  checkIfAiderBuffer: async (_: Denops, bufnr: number): Promise<boolean> => {
    return bufnr === mockAiderBufnr;
  },
};
