import { Denops } from "https://deno.land/x/denops_std@v5.0.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.0.0/function/mod.ts";
import * as v from "https://deno.land/x/denops_std@v5.2.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.14.0/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.1.0/function/mod.ts";

export async function main(denops: Denops): Promise<void> {
  async function getCurrentFilePath(): Promise<string> {
    return ensure(await fn.expand(denops, "%:p"), is.String);
  }
  async function splitWithDirection(): Promise<string> {
    const splitDirection = ensure(
      await v.g.get(denops, "aider_split_direction"),
      is.String,
    );
    await denops.cmd(splitDirection ?? "split");
    return splitDirection ?? "split";
  }

  denops.dispatcher = {
    async runAider(): Promise<void> {
      await splitWithDirection();
      await this.runAiderCommand();
    },
    async sendPrompt(prompt: unknown): Promise<void> {
      const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
      const str = ensure(prompt, is.String) + "\n";
      for (let i = 0; i <= win_count; i++) {
        const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);
        if (await fn.getbufvar(denops, bufnr, "&buftype") === "terminal") {
          const job_id = ensure(
            await fn.getbufvar(denops, bufnr, "terminal_job_id"),
            is.Number,
          );
          if (job_id !== 0) {
            await denops.call("chansend", job_id, str);
            await denops.cmd(`${i}wincmd w`);
            await feedkeys(denops, "G");
            await denops.cmd("wincmd p");
          }
        }
      }
    },
    async addCurrentFile(): Promise<void> {
      const currentFile = await getCurrentFilePath();
      const prompt = `/add ${currentFile}`;
      await this.sendPrompt(prompt);
    },
    async runAiderCommand(): Promise<void> {
      const currentFile = await getCurrentFilePath();
      const aiderCommand = ensure(
        await v.g.get(denops, "aider_command"),
        is.String,
      );
      await denops.cmd(`terminal ${aiderCommand} ${currentFile}`);
    },
  };

  await denops.cmd(
    `command! -nargs=0 AiderSendPrompt call denops#notify("${denops.name}", "sendPrompt", [input("Prompt: ")])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderAddCurrentFile call denops#notify("${denops.name}", "addCurrentFile", [])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider", [])`,
  );
}
