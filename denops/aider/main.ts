import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
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
      await denops.dispatcher.sendPromptWithInput();
    },
    async ask(question: unknown): Promise<void> {
      const prompt = `/ask ${question}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput();
    },
    async openIgnore(): Promise<void> {
      await aiderCommand.openIgnore(denops);
    },
    async debug(): Promise<void> {
      await aiderCommand.debug(denops);
    },
    async silentRunAider(): Promise<void> {
      await aiderCommand.silentRun(denops);
    },
    async addIgnoreCurrentFile(): Promise<void> {
      await aiderCommand.addIgnoreCurrentFile(denops);
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
    `command! -nargs=1 AiderAsk call denops#notify("${denops.name}", "ask", [<f-args>])`,
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
