import { Denops } from "https://deno.land/x/denops_std@v5.0.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.0.0/function/mod.ts";
import * as v from "https://deno.land/x/denops_std@v5.2.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.14.0/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    async splitWithDirection(): Promise<string> {
      const splitDirection = ensure(
        await v.g.get(denops, "aider_split_direction"),
        is.String,
      );
      await denops.cmd(splitDirection ?? "split");
      return splitDirection ?? "split";
    },
    async runAiderCommand(): Promise<void> {
      // 現在のファイル取得
      const currentFile = ensure(
        await fn.expand(denops, "%:p"),
        is.String,
      );
      // aider起動
      const aiderCommand = ensure(
        await v.g.get(denops, "aider_command"),
        is.String,
      );
      await denops.cmd(`terminal ${aiderCommand} ${currentFile}`);
    },
    async runAider(): Promise<void> {
      await this.splitWithDirection();
      await this.runAiderCommand();
    },
    // プロンプト送信
    async sendPrompt(prompt: unknown): Promise<void> {
      console.log(prompt);
      // プロンプトを取得
      // コマンドを合成
      // aiderのウインドウに送信
    },
    // 現在のファイルをaddする
    async addCurrentFile(): Promise<void> {
      // 現在のファイルを取得
      // aiderのウインドウにaddする
    },
  };

  await denops.cmd(
    `command! -nargs=0 AiderSendPrompt call denops#notify("${denops.name}", "sendPrompt", [input("Prompt: ")])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderAddCurrentFile call denops#notify("${denops.name}", "addCurrentFile")`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider", [])`,
  );
}
