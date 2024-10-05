// deno-lint-ignore-file require-await
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import type { AiderCommands } from "./aiderCommand.ts";
import { emit } from "https://deno.land/x/denops_std@v6.4.0/autocmd/mod.ts";

class MockAider {
  private bufNr: number | undefined;

  run = async (denops: Denops): Promise<undefined> => {
    const newBuf = await fn.bufnr(denops, "dummyaider", true);
    await emit(denops, "User", "AiderOpen");
    this.bufNr = newBuf;
  };

  silentRun = async (denops: Denops): Promise<undefined> => {
    await this.run(denops);
    await denops.cmd("b#"); // hide buffer
  };

  sendPrompt = async (
    denops: Denops,
    _jobId: number,
    prompt: string,
  ): Promise<undefined> => {
    fn.feedkeys(denops, `input: ${prompt}\n`);
  };

  exit = async (denops: Denops): Promise<undefined> => {
    if (this.bufNr === undefined) {
      return;
    }

    await fn.bufnr(denops, this.bufNr.toString(), true);
    await denops.cmd("bd!");
  };
  checkIfAiderBuffer = async (_: Denops, bufnr: number): Promise<boolean> => {
    return bufnr === this.bufNr;
  };
}

const mockAider = new MockAider();

export const commands: AiderCommands = {
  run: mockAider.run,
  silentRun: mockAider.silentRun,
  sendPrompt: mockAider.sendPrompt,
  exit: mockAider.exit,
  checkIfAiderBuffer: mockAider.checkIfAiderBuffer,
};
