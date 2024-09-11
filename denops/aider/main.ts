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
  type ArgCount = "0" | "1" | "*";
  type ArgType<T extends ArgCount> = T extends "0" ? void
    : T extends "1" ? string
    : string[];
  type Command<T extends ArgCount> = {
    methodName: string;
    decl: Promise<void>;
    impl: (args: ArgType<T>) => Promise<void>;
  };

  function command<T extends ArgCount>(
    dispatcherMethod: string,
    argCount: T,
    impl: (args: ArgType<T>) => Promise<void>,
    pattern: "[<f-args>]" | "[<line1>, <line2>]" | "" = "",
    range: boolean = false,
  ): Command<T> {
    const rangePart = range ? "-range " : "";
    const commandName = "Aider" + dispatcherMethod.charAt(0).toUpperCase() +
      dispatcherMethod.slice(1);
    const nargsUsage = argCount === "*" ? pattern : "[]";
    return {
      methodName: dispatcherMethod,
      decl: denops.cmd(
        `command! -nargs=${argCount} ${rangePart} ${commandName} call denops#notify("${denops.name}", "${dispatcherMethod}", ${nargsUsage})`,
      ),
      impl: impl,
    };
  }

  const commands: Command<ArgCount>[] = [
    command(
      "sendPrompt",
      "0",
      () => buffer.sendPrompt(denops, openBufferType),
    ),
    command("run", "0", async () => {
      if (await buffer.openAiderBuffer(denops, openBufferType)) {
        return;
      }
      await aiderCommand.run(denops);
    }),
    command("silentRun", "0", () => aiderCommand.silentRun(denops)),
    command("addFile", "1", async (path: string) => {
      if (path === "") {
        return;
      }
      const prompt = `/add ${path}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput();
    }),
    command(
      "addCurrentFile",
      "0",
      () => aiderCommand.addCurrentFile(denops),
    ),
    command("addWeb", "1", async (url: unknown) => {
      const prompt = `/web ${url}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput();
    }),
    command("ask", "1", async (question) => {
      const prompt = `/ask ${question}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput();
    }),
    command("exit", "0", () => buffer.exitAiderBuffer(denops)),
    command(
      "openFloatingWindowWithSelectedCode",
      "*",
      async ([start, end]) => {
        await buffer.openFloatingWindowWithSelectedCode(
          denops,
          start,
          end,
          openBufferType,
        );
      },
      "[<line1>, <line2>]",
      true,
    ),
    command(
      "openIgnore",
      "*",
      () => aiderCommand.openIgnore(denops),
      "[<f-args>]",
      true,
    ),
    command(
      "addIgnoreCurrentFile",
      "*",
      () => aiderCommand.addIgnoreCurrentFile(denops),
      "[<f-args>]",
      true,
    ),
    command(
      "debug",
      "*",
      () => aiderCommand.debug(denops),
      "[<f-args>]",
      true,
    ),
    command(
      "hide",
      "*",
      async () => {
        await denops.cmd("close!");
        await denops.cmd(`silent! e!`);
      },
      "[<f-args>]",
      true,
    ),
  ];
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
}
