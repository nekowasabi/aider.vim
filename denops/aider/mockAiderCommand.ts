// deno-lint-ignore-file require-await
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import type { AiderCommands } from "./aiderCommand.ts";
import { emit } from "https://deno.land/x/denops_std@v6.4.0/autocmd/mod.ts";

class MockAider {
  private bufNr: number;

  constructor() {
    this.bufNr = 0;
  }

  async run(denops: Denops): Promise<undefined> {
    const newBuf = await fn.bufnr(denops, "dummyaider", true);
    await emit(denops, "User", "AiderOpen");
    this.bufNr = newBuf;
  }

  async silentRun(denops: Denops): Promise<undefined> {
    await this.run(denops);
    await denops.cmd("b#"); // hide buffer
  }

  async sendPrompt(
    denops: Denops,
    _: number,
    prompt: string,
  ): Promise<undefined> {
    fn.feedkeys(denops, `input: ${prompt}\n`);
  }

  async exit(denops: Denops): Promise<undefined> {
    // open bufNr and close
    await fn.bufnr(denops, this.bufNr.toString(), true);
    await denops.cmd("bd!");
  }
  async checkIfAiderBuffer(_: Denops, bufnr: number): Promise<boolean> {
    return bufnr === this.bufNr;
  }
}

const mockAider = new MockAider();

export const commands: AiderCommands = {
  run: mockAider.run,
  silentRun: mockAider.silentRun,
  sendPrompt: mockAider.sendPrompt,
  exit: mockAider.exit,
  checkIfAiderBuffer: mockAider.checkIfAiderBuffer,
};
