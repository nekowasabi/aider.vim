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

  type Command = {
    methodName: string;
    impl: ImplType;
  };

  /**
   * Denopsディスパッチャー用のコマンドと`command!`宣言を生成します。
   *
   * @param {string} dispatcherMethod - ディスパッチャーで使用されるメソッド名。Vim側に見えるコマンド名は Aider + DispatcherMethod のようになります。
   * @param {ImplType} impl - コマンドの実装関数。
   * @param {"[<f-args>]" | "[<line1>, <line2>]" | "[]"} [pattern="[]"] - コマンドの引数パターン。
   * @param {boolean} [range=false] - コマンドがVisualモードで動作するかどうか。
   * @returns {Promise<Command>} - メソッド名、`command!`宣言、実装を含むコマンドオブジェクト。
   */
  async function command(
    dispatcherMethod: string,
    impl: ImplType,
    pattern: "[<f-args>]" | "[<line1>, <line2>]" | "[]" = "[]",
    range: boolean = false,
  ): Promise<Command> {
    const rangePart = range ? "-range " : "";

    const commandName = "Aider" + dispatcherMethod.charAt(0).toUpperCase() +
      dispatcherMethod.slice(1);
    const argCount = (() => {
      if (impl.length === 0) return "0";
      if (impl.length === 1) return "1";
      else return "*";
    })();

    await denops.cmd(
      `command! -nargs=${argCount} ${rangePart} ${commandName} call denops#notify("${denops.name}", "${dispatcherMethod}", ${pattern})`,
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
    impl: ImplType,
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
      () => buffer.sendPrompt(denops, openBufferType),
    ),
    await command("run", async () => {
      if (await buffer.openAiderBuffer(denops, openBufferType)) {
        return;
      }
      await aiderCommand.run(denops);
    }),
    await command("silentRun", () => aiderCommand.silentRun(denops)),
    dispatchOnly(
      "sendPromptWithInput",
      () => buffer.sendPromptWithInput(denops),
    ),
    await command("addFile", async (path: unknown) => {
      const prompt = `/add ${path}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput(path);
    }, "[<f-args>]"),
    await command("addCurrentFile", () => aiderCommand.addCurrentFile(denops)),
    await command("addWeb", async (url: unknown) => {
      const prompt = `/web ${url}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput(url);
    }, "[<f-args>]"),
    await command("ask", async (question: unknown) => {
      const prompt = `/ask ${question}`;
      await v.r.set(denops, "q", prompt);
      await denops.dispatcher.sendPromptWithInput(question);
    }, "[<f-args>]"),
    await command("exit", () => buffer.exitAiderBuffer(denops)),
    await command(
      "openFloatingWindowWithSelectedCode",
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
    await command("openIgnore", () => aiderCommand.openIgnore(denops)),
    await command(
      "addIgnoreCurrentFile",
      () => aiderCommand.addIgnoreCurrentFile(denops),
    ),
    await command("debug", () => aiderCommand.debug(denops)),
    await command("hide", async () => {
      await denops.cmd("close!");
      await denops.cmd(`silent! e!`);
    }),
  ];

  denops.dispatcher = Object.fromEntries(commands.map((command) => [
    command.methodName,
    command.impl as (args: unknown) => Promise<void>,
  ]));
}
