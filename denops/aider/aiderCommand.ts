import { Denops } from "https://deno.land/x/denops_std@v5.0.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import { getCurrentFilePath, getTerminalBufferNr } from "./utils.ts";
import { buffer } from "./buffer.ts";

export const aiderCommand = {
  async debug(denops: Denops): Promise<void> {
    await denops.cmd("b#");
  },

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
   * 現在のファイルをAiderに追加します。
   * @param {Denops} denops - Denopsインスタンス
   * @returns {Promise<void>}
   */
  async addCurrentFile(denops: Denops): Promise<void> {
    const bufnr = await fn.bufnr(denops, "%");
    if (await getTerminalBufferNr(denops) === undefined) {
      await this.run(denops);
    }
    const bufType = await fn.getbufvar(denops, bufnr, "&buftype");
    if (bufType === "terminal") {
      return;
    }
    const currentFile = await getCurrentFilePath(denops);
    const prompt = `/add ${currentFile}`;
    await v.r.set(denops, "q", prompt);
    await buffer.sendPromptWithInput(denops);
  },
};
