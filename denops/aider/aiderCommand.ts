import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";

export const aiderCommand = {
  async debug(denops: Denops): Promise<void> {
    await denops.cmd("b#");
  },

  /**
   * Aiderバッファにメッセージを送信します。
   * @param {Denops} denops - Denops instance
   * @param {number} jobId - The job id to send the message to
   * @param {string} prompt - The prompt to send
   * @returns {Promise<void>}
   */
  async sendPrompt(
    denops: Denops,
    jobId: number,
    prompt: string,
  ): Promise<void> {
    console.log(prompt);
    console.log(jobId);
    await v.r.set(denops, "q", prompt);
    await fn.feedkeys(denops, "G");
    await fn.feedkeys(denops, '"qp');
    await denops.call("chansend", jobId, "\n");
  },

  /**
   * .aiderignoreファイルを開きます。
   * ファイルが存在する場合は編集モードで開き、存在しない場合はエラーメッセージを表示します。
   * @param {Denops} denops - Denopsインスタンス
   * @returns {Promise<void>}
   */
  async openIgnore(denops: Denops): Promise<void> {
    const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
      .trim();
    const filePathToOpen = `${gitRoot}/.aiderignore`;
    if (await fn.filereadable(denops, filePathToOpen)) {
      await denops.cmd(`edit ${filePathToOpen}`);
      return;
    }
    console.log(".aiderignoreファイルが見つかりません。");
  },

  async run(denops: Denops): Promise<void> {
    const aiderCommand = ensure(
      await v.g.get(denops, "aider_command"),
      is.String,
    );
    await denops.cmd(`terminal ${aiderCommand}`);
  },
  /**
   * Aiderをバックグラウンドで実行します。
   * 新しいバッファを作成し、Aiderコマンドをターミナルで実行した後、
   * 前のバッファに戻ります。
   * @param {Denops} denops - Denopsインスタンス
   * @returns {Promise<void>}
   */
  async silentRun(denops: Denops): Promise<void> {
    await denops.cmd("enew");

    const aiderCommand = ensure(
      await v.g.get(denops, "aider_command"),
      is.String,
    );
    await denops.cmd(`terminal ${aiderCommand}`);

    await denops.cmd("b#");

    await denops.cmd("echo 'Aider is running in the background.'");
  },
};
