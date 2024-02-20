import { Denops } from "https://deno.land/x/denops_std@v5.0.0/mod.ts";
// import * as fn from "https://deno.land/x/denops_std@v5.0.0/function/mod.ts";
// import * as v from "https://deno.land/x/denops_std@v5.2.0/variable/mod.ts";
// import { is } from "https://deno.land/x/unknownutil@v3.14.0/mod.ts";

export async function main(denops: Denops): Promise<void> {
  denops.dispatcher = {
    // ウインドウを分割して、現在のファイルを指定してaider起動
    async runAider(): Promise<void> {
      // 分割方向を判定
      // 分割
      // 現在のファイル取得
      // aider起動
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
    `command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider")`,
  );
}
