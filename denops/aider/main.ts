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
  type ImplType =
    | (() => Promise<void>)
    | ((arg: unknown) => Promise<void>)
    | ((args: unknown[]) => Promise<void>);

  type ArgCount<T extends ImplType> = T extends () => Promise<void> ? "0"
    : T extends (arg: unknown) => Promise<void> ? "1"
    : "*";

  type Command = {
    methodName: string;
    decl: Promise<void>;
    impl: ImplType;
  };

  /**
   * Denopsディスパッチャー用のコマンドとcommand!宣言を生成します。
   *
   * @param {string} dispatcherMethod - ディスパッチャーで使用されるメソッド名。vim側に見えるコマンド名は Aider + DispatcherMethod のようになります。
   * @param {ArgCount} argCount - コマンドが受け取る引数の数。
   * @param {(args: ArgType<T>) => Promise<void>} impl - コマンドの実装関数。
   * @param {"[<f-args>]" | "[<line1>, <line2>]" | ""} [pattern=""] - コマンドの引数パターン。argCountが"*"の場合のみ有効。
   * @param {boolean} [range=false] - コマンドがvisual modeで動作するかどうか。
   * @returns {Command<T>} - メソッド名、command!宣言、実装を含むコマンドオブジェクト。
   */
  function command<T extends ImplType>(
    dispatcherMethod: string,
    argCount: ArgCount<T>,
    impl: T,
    pattern: "[<f-args>]" | "[<line1>, <line2>]" | "" = "",
    range: boolean = false,
  ): Command {
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

  const openBufferType: BufferLayout = await buffer.getOpenBufferType(denops);

  const commands: Command[] = [
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
    command("addFile", "1", async (path: unknown) => {
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
    command("ask", "1", async (question: unknown) => {
      const prompt = `/ask ${question}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput();
    }),
    command("exit", "0", () => buffer.exitAiderBuffer(denops)),
    command(
      "openFloatingWindowWithSelectedCode",
      "*",
      async ([start, end]: unknown[]) => {
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
      (_args: unknown[]) => aiderCommand.openIgnore(denops),
      "[<f-args>]",
      true,
    ),
    command(
      "addIgnoreCurrentFile",
      "*",
      (_args: unknown[]) => aiderCommand.addIgnoreCurrentFile(denops),
      "[<f-args>]",
      true,
    ),
    command(
      "debug",
      "*",
      (_args: unknown[]) => aiderCommand.debug(denops),
      "[<f-args>]",
      true,
    ),
    command(
      "hide",
      "*",
      async (_args: unknown[]) => {
        await denops.cmd("close!");
        await denops.cmd(`silent! e!`);
      },
      "[<f-args>]",
      true,
    ),
  ];

  denops.dispatcher = Object.fromEntries(commands.map((command) => [
    command.methodName,
    command.impl as (args: unknown) => Promise<void>,
  ]));
}
