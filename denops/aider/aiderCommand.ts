import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
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
  exit: (denops: Denops, jobId: number, bufnr: number) => Promise<undefined>;
  checkIfAiderBuffer: (denops: Denops, bufnr: number) => Promise<boolean>;
  isTestMode: () => boolean;
}

let testMode = false;

export const setTestMode = () => {
  testMode = true;
};

export const aider = () => {
  return testMode ? mock.commands : actual.commands;
};
