import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { aider } from "./aiderCommand.ts";
import * as buffer from "./bufferOperation.ts";
import type { BufferLayout } from "./bufferOperation.ts";
import { getCurrentFilePath } from "./utils.ts";

/**
 * The main function that sets up the Aider plugin functionality.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>}
 */
export async function main(denops: Denops): Promise<void> {
  /**
   * コマンドの引数の数を定義
   * "0"は引数なし、"1"は1つの引数、"*"は複数の引数を意味します。
   */
  type ArgCount = "0" | "1" | "*";

  /**
   * ArgCountに基づいて異なる型の関数を定義
   * "0"の場合は引数なしの関数、"1"の場合は1つの引数を取る関数、
   * "*"の場合は2つの引数を取る関数を意味します。
   */
  type ImplType<T extends ArgCount> = T extends "0"
    ? () => Promise<void>
    : T extends "1"
      ? (arg: string) => Promise<void>
      : (arg: string, arg2: string) => Promise<void>; // MEMO: ArgCountは*だが現状2つのみ対応している

  /**
   * コマンドのオプションを定義
   * patternは引数のパターンを指定し、completeは補完の種類を指定し、
   * rangeは範囲指定が可能かどうかを示します。
   *
   * @property {string} [pattern] - 引数のパターンを指定します。
   * @property {("file" | "shellcmd")} [complete] - 補完の種類を指定します。ファイル補完またはシェルコマンド補完が可能です。
   * @property {boolean} [range] - 範囲指定が可能かどうかを示します。
   */
  type Opts<T extends ArgCount> = {
    pattern?: T extends "0" ? undefined : T extends "1" ? "[<f-args>]" : "[<line1>, <line2>]";
    complete?: T extends "1" ? "file" | "shellcmd" : undefined;
    range?: T extends "*" ? boolean : undefined;
  };

  /**
   * Commandは、メソッド名とその実装を含むコマンドオブジェクトを定義します。
   */
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

    const commandName = `Aider${dispatcherMethod.charAt(0).toUpperCase()}${dispatcherMethod.slice(1)}`;
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

  const openBufferType: BufferLayout = await buffer.getOpenBufferType(denops);

  async function addFileToAider(denops: Denops, openBufferType: BufferLayout, prefix: string): Promise<void> {
    const currentBufnr = await fn.bufnr(denops, "%");
    const aiderBuffer = await buffer.getAiderBuffer(denops);

    if (!aiderBuffer) {
      await buffer.prepareAiderBuffer(denops, openBufferType);
    }

    if (await buffer.checkIfTerminalBuffer(denops, currentBufnr)) {
      return;
    }

    const currentFile = await getCurrentFilePath(denops);
    const prompt = `/${prefix} ${currentFile}`;
    await buffer.sendPrompt(denops, prompt);
  }

  const commands: Command[] = [
    await command("sendPrompt", "0", async () => {
      await buffer.sendPromptByBuffer(denops, openBufferType);
    }),

    await command("run", "0", async () => {
      await buffer.openAiderBuffer(denops, openBufferType);
    }),

    await command("silentRun", "0", () => aider().silentRun(denops)),

    await command("hideVisualSelectFloatingWindow", "0", async () => {
      await buffer.hideVisualSelectFloatingWindow(denops);
    }),

    await command("hide", "0", async () => {
      await denops.cmd("fclose!");
      await denops.cmd("silent! e!");
    }),

    await command(
      "addFile",
      "1",
      async (path: string) => {
        const prompt = `/add ${path}`;

        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),

    await command("addBuffers", "0", async () => {
      const buffersPath = await buffer.getFileBuffers(denops);
      const prompt = `/add ${buffersPath}`;

      await buffer.sendPrompt(denops, prompt);
    }),

    await command("addCurrentFile", "0", async () => {
      await addFileToAider(denops, openBufferType, "add");
    }),

    await command(
      "addFileReadOnly",
      "1",
      async (path: string) => {
        const prompt = `/read-only ${path}`;

        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),

    await command("addCurrentFileReadOnly", "0", async () => {
      await addFileToAider(denops, openBufferType, "read-only");
    }),

    await command(
      "addWeb",
      "1",
      async (url: string) => {
        const prompt = `/web ${url}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("paste", "0", async () => {
      const prompt = "/paste";
      await buffer.sendPrompt(denops, prompt);
    }),

    await command(
      "ask",
      "1",
      async (question: string) => {
        const prompt = `/ask ${question}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("exit", "0", () => buffer.exitAiderBuffer(denops)),

    await command(
      "visualTextWithPrompt",
      "*",
      async (start: string, end: string) => {
        await buffer.openFloatingWindowWithSelectedCode(denops, start, end, openBufferType);
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    await command("openIgnore", "0", async () => {
      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel")).trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      if (await fn.filereadable(denops, filePathToOpen)) {
        await denops.cmd(`edit ${filePathToOpen}`);
        return;
      }
      console.log(".aiderignore file not found.");
    }),

    await command("addIgnoreCurrentFile", "0", async () => {
      const currentFile = await getCurrentFilePath(denops);
      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel")).trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      const relativePath = currentFile.replace(gitRoot, "");

      const fileContent = await fn.readfile(denops, filePathToOpen);
      fileContent.push(`!${relativePath}`);
      await fn.writefile(denops, fileContent, filePathToOpen);
      console.log(`Added ${currentFile} to .aiderignore`);
    }),

    await command("voice", "0", async () => {
      const prompt = "/voice";
      await buffer.prepareAiderBuffer(denops, openBufferType);
      await buffer.sendPrompt(denops, prompt);
      await fn.feedkeys(denops, "a"); // Start insert mode to accepet Enter key
    }),

    await command(
      "test",
      "1",
      async (cmd: string) => {
        const prompt = `/test ${cmd}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "shellcmd" },
    ),
  ];

  denops.dispatcher = Object.fromEntries(
    commands.map((command) => [command.methodName, command.impl as (args: unknown) => Promise<void>]),
  );
}
