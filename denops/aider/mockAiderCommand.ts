import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import type { AiderCommand } from "./aiderCommand.ts";

let mockAiderBufnr: number | undefined = undefined;

export const commands: AiderCommand = {
  run: async (denops: Denops): Promise<undefined> => {
    const bufnr = await fn.bufnr(denops, "%");
    await denops.cmd("file dummyaider"); // set buffer name
    await fn.deletebufline(denops, bufnr, 1, "$"); // clear the buffer
    await denops.cmd(`setlocal buftype=nofile`); // set buffer type for proper handling

    await emit(denops, "User", "AiderOpen");
    mockAiderBufnr = bufnr;
  },

  sendPrompt: async (
    denops: Denops,
    _jobId: number,
    prompt: string,
  ): Promise<undefined> => {
    if (mockAiderBufnr === undefined) {
      return;
    }
    const lineCount = await fn.line(denops, "$", mockAiderBufnr);
    const firstLine = await fn.getline(denops, 1, mockAiderBufnr);
    if (lineCount === 1 && Array.isArray(firstLine) && firstLine.length === 1 && firstLine[0] === "") {
      // Replace empty line instead of appending
      await fn.setline(denops, 1, `input: ${prompt}`);
    } else {
      await fn.appendbufline(denops, mockAiderBufnr, "$", `input: ${prompt}`);
    }
  },

  exit: async (
    denops: Denops,
    _jobId: number,
    _bufnr: number,
  ): Promise<undefined> => {
    if (mockAiderBufnr === undefined) {
      return;
    }

    await denops.cmd(`bdelete! ${mockAiderBufnr}`);
    mockAiderBufnr = undefined;
    await denops.cmd("bd!");
  },

  // deno-lint-ignore require-await
  checkIfAiderBuffer: async (_: Denops, bufnr: number): Promise<boolean> => {
    return bufnr === mockAiderBufnr;
  },
  isTestMode: () => true,
};
