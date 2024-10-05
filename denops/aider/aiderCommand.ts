import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { is, maybe } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import * as actual from "./actualAiderCommand.ts";
import * as mock from "./mockAiderCommand.ts";

export interface AiderCommand {
  run: (denops: Denops) => Promise<undefined>;
  silentRun: (denops: Denops) => Promise<undefined>;
  sendPrompt: (
    denops: Denops,
    jobId: number,
    prompt: string,
  ) => Promise<undefined>;
  exit: (denops: Denops) => Promise<undefined>;
  checkIfAiderBuffer: (denops: Denops, bufnr: number) => Promise<boolean>;
}

let testMode = false;

// main.tsで最初に呼び出しておく
export const setupAiderCommands = async (denops: Denops) => {
  testMode = maybe(await v.g.get(denops, "aider_test"), is.Boolean) ?? false;
};

export const aider = () => {
  return testMode ? mock.commands : actual.commands;
};
