import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { aiderCommand } from "./aiderCommand.ts";
import { buffer, BufferLayout } from "./buffer.ts";
import { getAiderBufferNr, getCurrentFilePath } from "./utils.ts";

/**
 * The main function that sets up the Aider plugin functionality.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>}
 */
export async function main(denops: Denops): Promise<void> {
  type ArgCount = "0" | "1" | "*";
  type ImplType<T extends ArgCount> = T extends "0" ? (() => Promise<void>)
    : T extends "1" ? ((arg: string) => Promise<void>)
    : ((arg: string, arg2: string) => Promise<void>); // MEMO: ArgCountは*だが現状2つのみ対応している

  type Opts<T extends ArgCount> = {
    pattern?: T extends "0" ? undefined
      : T extends "1" ? "[<f-args>]"
      : "[<line1>, <line2>]";
    complete?: T extends "1" ? "file" | "shellcmd" : undefined;
    range?: T extends "*" ? boolean : undefined;
  };

  type Command = {
    methodName: string;
    impl: ImplType<ArgCount>;
  };

  /**
   * Denopsディスパッチャー用のコマンドと`command!`宣言を生成します。
   *
   * @param {string} dispatcherMethod - ディスパッチャーで使用されるメソッド名。Vim側に見えるコマンド名は Aider + DispatcherMethod のようになります。
   * @param {ImplType} impl - コマンドの実装関数。
   * @param {Opts} opts - オプション。フィールドはargCountによって変わるので型を参照。
   * @returns {Promise<Command>} - メソッド名、`command!`宣言、実装を含むコマンドオブジェクト。
   */
  async function command<argCount extends ArgCount>(
    dispatcherMethod: string,
    argCount: argCount,
    impl: ImplType<argCount>,
    opts: Opts<argCount> = {} as Opts<argCount>,
  ): Promise<Command> {
    const rangePart = opts.range ? "-range" : "";

    const commandName = "Aider" + dispatcherMethod.charAt(0).toUpperCase() +
      dispatcherMethod.slice(1);
    const completePart = opts.complete ? `-complete=${opts.complete}` : "";
    const patternPart = opts.pattern ?? "[]";

    await denops.cmd(
      `command! -nargs=${argCount} ${completePart} ${rangePart} ${commandName} call denops#notify("${denops.name}", "${dispatcherMethod}", ${patternPart})`,
    );
    return {
      methodName: dispatcherMethod,
      impl: impl,
    };
  }

  /**
   * Denopsディスパッチャー用のコマンドを生成します。`command!`宣言は生成されません。
   *
   * @param {string} dispatcherMethod - ディスパッチャーで使用されるメソッド名。
   * @param {ImplType} impl - コマンドの実装関数。
   * @returns {Command} - メソッド名と実装を含むコマンドオブジェクト。
   */
  function dispatchOnly(
    dispatcherMethod: string,
    impl: ImplType<ArgCount>,
  ): Command {
    return {
      methodName: dispatcherMethod,
      impl: impl,
    };
  }

  const openBufferType: BufferLayout = await buffer.getOpenBufferType(denops);

  const commands: Command[] = [
    await command(
      "sendPrompt",
      "0",
      () => buffer.sendPrompt(denops, openBufferType),
    ),
    await command("run", "0", async () => {
      if (await buffer.openAiderBuffer(denops, openBufferType)) {
        return;
      }
      await aiderCommand.run(denops);
    }),
    await command("silentRun", "0", () => aiderCommand.silentRun(denops)),
    dispatchOnly(
      "sendPromptWithInput",
      () => buffer.sendPromptWithInput(denops),
    ),
    await command(
      "addFile",
      "1",
      async (path: string) => {
        const prompt = `/add ${path}`;
        await v.r.set(denops, "q", prompt);
        await denops.dispatcher.sendPromptWithInput();
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),
    await command(
      "addCurrentFile",
      "0",
      async () => {
        const bufnr = await fn.bufnr(denops, "%");
        if (await getAiderBufferNr(denops) === undefined) {
          await aiderCommand.silentRun(denops);
        }
        if (await buffer.checkIfTerminalBuffer(denops, bufnr)) {
          return;
        }
        const currentFile = await getCurrentFilePath(denops);
        const prompt = `/add ${currentFile}`;
        await v.r.set(denops, "q", prompt);
        await buffer.sendPromptWithInput(denops);
      },
    ),

    await command(
      "addWeb",
      "1",
      async (url: string) => {
        const prompt = `/web ${url}`;
        await v.r.set(denops, "q", prompt);
        await denops.dispatcher.sendPromptWithInput();
      },
      { pattern: "[<f-args>]" },
    ),
    await command(
      "ask",
      "1",
      async (question: string) => {
        const prompt = `/ask ${question}`;
        await v.r.set(denops, "q", prompt);
        await denops.dispatcher.sendPromptWithInput();
      },
      { pattern: "[<f-args>]" },
    ),
    await command("exit", "0", () => buffer.exitAiderBuffer(denops)),
    await command(
      "visualTextWithPrompt",
      "*",
      async (start: string, end: string) => {
        await buffer.openFloatingWindowWithSelectedCode(
          denops,
          start,
          end,
          openBufferType,
        );
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),
    await command("openIgnore", "0", () => aiderCommand.openIgnore(denops)),
    await command(
      "addIgnoreCurrentFile",
      "0",
      async () => {
        {
          const currentFile = await getCurrentFilePath(denops);

          const gitRoot =
            (await fn.system(denops, "git rev-parse --show-toplevel"))
              .trim();
          const filePathToOpen = `${gitRoot}/.aiderignore`;
          const forAiderIgnorePath = currentFile.replace(gitRoot, "");

          const file = await fn.readfile(denops, filePathToOpen);
          file.push(`!${forAiderIgnorePath}`);

          await fn.writefile(denops, file, filePathToOpen);
          console.log(`Added ${currentFile} to .aiderignore`);
        }
      },
    ),
    await command("debug", "0", () => aiderCommand.debug(denops)),
    await command("hide", "0", async () => {
      await denops.cmd("close!");
      await denops.cmd(`silent! e!`);
    }),
    await command(
      "test",
      "1",
      async (cmd: string) => {
        const prompt = `/test ${cmd}`;
        await v.r.set(denops, "q", prompt);
        await denops.dispatcher.sendPromptWithInput();
      },
      { pattern: "[<f-args>]", complete: "shellcmd" },
    ),
  ];

  denops.dispatcher = Object.fromEntries(commands.map((command) => [
    command.methodName,
    command.impl as (args: unknown) => Promise<void>,
  ]));
}
