import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { getCurrentFilePath, getTerminalBufferNr } from "./utils.ts";
import { aiderCommand } from "./aiderCommand.ts";
import { buffer, BufferLayout } from "./buffer.ts";

/**
 * The main function that sets up the Aider plugin functionality.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>}
 */
export async function main(denops: Denops): Promise<void> {
  const openBufferType: BufferLayout = await buffer.getOpenBufferType(denops);

  denops.dispatcher = {
    /**
     * Aiderを実行します。
     * 既存のAiderバッファがある場合はそれを開き、
     * ない場合は新しいAiderコマンドを実行します。
     * @returns {Promise<void>}
     */
    async runAider(): Promise<void> {
      if (await buffer.openAiderBuffer(denops, openBufferType)) {
        return;
      }
      await aiderCommand.run(denops);
    },
    async sendPrompt(): Promise<void> {
      await buffer.sendPrompt(denops, openBufferType);
    },
    async sendPromptWithInput(): Promise<void> {
      await buffer.sendPromptWithInput(denops);
    },
    async addCurrentFile(): Promise<void> {
      await aiderCommand.addCurrentFile(denops);
    },
    async addFile(path: unknown): Promise<void> {
      if (path === "") {
        return;
      }
      const prompt = `/add ${path}`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput();
    },
    async addWeb(url: unknown): Promise<void> {
      if (url === "") {
        return;
      }
      const prompt = `/web ${url}`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput();
    },
    async exit(): Promise<void> {
      const bufnr = await getTerminalBufferNr(denops);
      if (bufnr !== undefined) {
        await denops.cmd(`${bufnr}bdelete!`);
      }
    },
    async openIgnore(): Promise<void> {
      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
        .trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      if (await fn.filereadable(denops, filePathToOpen)) {
        await denops.cmd(`edit ${filePathToOpen}`);
        return;
      }
      console.log("No .aiderignore file found.");
    },
    async debug(): Promise<void> {
      await aiderCommand.debug(denops);
    },
    async silentRunAider(): Promise<void> {
      await denops.cmd("enew");

      const aiderCommand = ensure(
        await v.g.get(denops, "aider_command"),
        is.String,
      );
      await denops.cmd(`terminal ${aiderCommand}`);

      await denops.cmd("b#");

      await denops.cmd("Aider is running in the background.");
    },
    async addIgnoreCurrentFile(): Promise<void> {
      const currentFile = await getCurrentFilePath(denops);

      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
        .trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      const forAiderIgnorePath = currentFile.replace(gitRoot, "");

      const file = await fn.readfile(denops, filePathToOpen);
      file.push(`!${forAiderIgnorePath}`);

      await fn.writefile(denops, file, filePathToOpen);
      console.log(`Added ${currentFile} to .aiderignore`);
    },
    async openFloatingWindowWithSelectedCode(
      start: unknown,
      end: unknown,
    ): Promise<void> {
      await buffer.openFloatingWindowWithSelectedCode(
        denops,
        start,
        end,
        openBufferType,
      );
    },
  };

  await denops.cmd(
    `command! -nargs=0 AiderSendPrompt call denops#notify("${denops.name}", "sendPrompt", [])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider", [])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderSilentRun call denops#notify("${denops.name}", "silentRunAider", [])`,
  );
  await denops.cmd(
    `command! -nargs=1 AiderAddFile call denops#notify("${denops.name}", "addFile", [<f-args>])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderAddCurrentFile call denops#notify("${denops.name}", "addCurrentFile", [])`,
  );
  await denops.cmd(
    `command! -nargs=1 AiderAddWeb call denops#notify("${denops.name}", "addWeb", [<f-args>])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderExit call denops#notify("${denops.name}", "exit", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderVisualTextWithPrompt call denops#notify("${denops.name}", "openFloatingWindowWithSelectedCode", [<line1>, <line2>])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderOpenIgnore call denops#notify("${denops.name}", "openIgnore", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderAddIgnoreCurrentFile call denops#notify("${denops.name}", "addIgnoreCurrentFile", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderDebug call denops#notify("${denops.name}", "debug", [])`,
  );
}
