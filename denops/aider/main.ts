import { relative } from "https://deno.land/std@0.115.1/path/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
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
  type ImplType<T extends ArgCount> = T extends "0" ? () => Promise<void>
    : T extends "1" ? (arg: string) => Promise<void>
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
    pattern?: T extends "0" ? undefined
      : T extends "1" ? "[<f-args>]"
      : "[<line1>, <line2>]";
    complete?: T extends "1" ? "file" | "shellcmd" : undefined;
    range?: T extends "*" ? boolean : undefined;
  };

  /**
   * Commandは、メソッド名とその実装を含むコマンドオブジェクトを定義します。
   * @property {string} methodName - Denopsディスパッチャーで使用されるメソッド名
   * @property {ImplType<ArgCount>} impl - コマンドの実装関数
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

    const commandName = `Aider${dispatcherMethod.charAt(0).toUpperCase()}${
      dispatcherMethod.slice(1)
    }`;
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
   * 現在のファイルをAiderに追加する関数
   * @param denops - Denopsインスタンス
   * @param openBufferType - バッファの開き方の設定
   * @param prefix - コマンドのプレフィックス ("add" または "read-only")
   * @param opts - オプション設定 (デフォルト: { openBuf: true })
   * @returns Promise<void>
   */
  async function addFileToAider(
    denops: Denops,
    openBufferType: BufferLayout,
    prefix: string,
    opts = { openBuf: true },
  ): Promise<void> {
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
    await buffer.sendPrompt(denops, prompt, opts);
  }

  const commands: Command[] = [
    await command("sendPromptByBuffer", "0", async () => {
      await buffer.sendPromptByBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
    }),

    await command(
      "sendPromptByCommandline",
      "1",
      async (prompt: string) => {
        await buffer.sendPrompt(denops, prompt, { openBuf: true });
      },
      { pattern: "[<f-args>]" },
    ),

    await command(
      "silentSendPromptByCommandline",
      "1",
      async (prompt: string) => {
        await buffer.sendPrompt(denops, prompt, { openBuf: false });
        console.log(`Sent prompt: ${prompt}`);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("run", "0", async () => {
      await buffer.openAiderBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
    }),

    await command("silentRun", "0", () => buffer.silentRun(denops)),

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
      const prompt = `/add ${buffersPath || ""}`;

      await buffer.sendPrompt(denops, prompt);
    }),

    await command("addCurrentFile", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "add",
      );
    }),

    await command("silentAddCurrentFile", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "add",
        { openBuf: false },
      );
      const currentFile = await getCurrentFilePath(denops);
      console.log(`Added ${currentFile} to Aider`);
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
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "read-only",
      );
    }),

    await command("silentAddCurrentFileReadOnly", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "read-only",
        {
          openBuf: false,
        },
      );
      const currentFile = await getCurrentFilePath(denops);
      console.log(`Added ${currentFile} to Aider read-only`);
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

    await command("toggleCodeMode", "0", async () => {
      const prompt = "/chat-mode code";
      await buffer.sendPrompt(denops, prompt);
    }),

    await command("toggleArchitectMode", "0", async () => {
      const prompt = "/chat-mode architect";
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

    await command("exit", "0", async () => {
      const aiderBuffer = await buffer.getAiderBuffer(denops);
      if (aiderBuffer) {
        buffer.exitAiderBuffer(denops);
      }
    }),

    await command(
      "addPartialReadonlyContext",
      "*",
      async (start: string, end: string) => {
        const partialContextFile = await buffer
          .getPartialContextFilePath(
            denops,
            start,
            end,
          );
        const prompt = `/read-only ${partialContextFile}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    await command(
      "visualTextWithPrompt",
      "*",
      async (start: string, end: string) => {
        await buffer.openFloatingWindowWithSelectedCode(
          denops,
          start,
          end,
          await buffer.getOpenBufferType(denops),
        );
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    await command("openIgnore", "0", async () => {
      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
        .trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      if (await fn.filereadable(denops, filePathToOpen)) {
        await denops.cmd(`edit ${filePathToOpen}`);
        return;
      }
      console.log(".aiderignore file not found.");
    }),

    await command("addIgnoreCurrentFile", "0", async () => {
      try {
        const currentFile = await getCurrentFilePath(denops);
        const gitRoot =
          (await fn.system(denops, "git rev-parse --show-toplevel"))
            .trim();
        const filePathToOpen = `${gitRoot}/.aiderignore`;
        const relativePath = relative(gitRoot, currentFile);

        const fileContent = await fn.readfile(denops, filePathToOpen);
        fileContent.push(`!${relativePath}`);
        await fn.writefile(denops, fileContent, filePathToOpen);
        console.log(`Added ${currentFile} to .aiderignore`);
      } catch (error) {
        console.error("Failed to add file to .aiderignore:", error);
      }
    }),

    /**
     * 音声入力コマンドを実行する
     * @async
     * @function
     * @throws {Error} 音声コマンドの実行に失敗した場合にスロー
     * @description
     * 1. Aiderバッファを準備
     * 2. /voiceコマンドを送信
     * 3. 挿入モードに切り替えて音声入力を受け付ける
     */
    await command("voice", "0", async () => {
      try {
        const prompt = "/voice";
        await buffer.prepareAiderBuffer(
          denops,
          await buffer.getOpenBufferType(denops),
        );
        await buffer.sendPrompt(denops, prompt);
        await fn.feedkeys(denops, "a"); // エンターキーを受け付けるため挿入モードを開始
      } catch (error) {
        console.error("音声コマンドの実行に失敗しました:", error);
      }
    }),

    /**
     * テストコマンドを実行する
     * @async
     * @function
     * @param {string} cmd - 実行するテストコマンド
     * @description
     * 1. 指定されたテストコマンドをAiderに送信
     * 2. シェルコマンドの補完をサポート
     */
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
    commands.map((
      command,
    ) => [
      command.methodName,
      command.impl as (args: unknown) => Promise<void>,
    ]),
  );
}
