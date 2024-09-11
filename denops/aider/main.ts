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
    async run(): Promise<void> {
      if (await buffer.openAiderBuffer(denops, openBufferType)) {
        return;
      }
      await aiderCommand.run(denops);
    },
    async addWeb(url: unknown): Promise<void> {
      const prompt = `/web ${url}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput();
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
    async exit(): Promise<void> {
      await buffer.exitAiderBuffer(denops);
    },
    async hide(): Promise<void> {
      await denops.cmd("close!");
      await denops.cmd(`silent! e!`);
    },
    async debug(): Promise<void> {
      await aiderCommand.debug(denops);
    },
    async silentRun(): Promise<void> {
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

  function declCommand(
    denops: Denops,
    dispatcherMethod: string,
    args: { num: "0" } | { num: "1" } | {
      num: "*";
      pattern: "[<f-args>]" | "[<line1>, <line2>]";
    } = { num: "0" },
    range: boolean = false,
  ): Promise<void> {
    const rangePart = range ? "-range " : "";
    const commandName = "Aider" + dispatcherMethod.charAt(0).toUpperCase() +
      dispatcherMethod.slice(1);
    const nargsUsage = args.num === "*" ? args.pattern : "";
    return denops.cmd(
      `command! -nargs=${args.num} ${rangePart} ${commandName} call denops#notify("${denops.name}", "${dispatcherMethod}", ${nargsUsage})`,
    );
  }

  await declCommand(denops, "sendPrompt");
  await declCommand(denops, "run");
  await declCommand(denops, "silentRun");
  await declCommand(denops, "addFile", { num: "1" });
  await declCommand(denops, "addCurrentFile");
  await declCommand(denops, "addWeb", { num: "1" });
  await declCommand(denops, "ask", { num: "1" });
  await declCommand(denops, "exit");
  await declCommand(denops, "openFloatingWindowWithSelectedCode", {
    num: "*",
    pattern: "[<line1>, <line2>]",
  }, true);
  await declCommand(
    denops,
    "openIgnore",
    { num: "*", pattern: "[<f-args>]" },
    true,
  );
  await declCommand(denops, "addIgnoreCurrentFile", {
    num: "*",
    pattern: "[<f-args>]",
  }, true);
  await declCommand(denops, "debug", { num: "*", pattern: "[<f-args>]" }, true);
  await declCommand(denops, "hide", { num: "*", pattern: "[<f-args>]" }, true);
}
