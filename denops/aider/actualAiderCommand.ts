import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import type { AiderCommand } from "./aiderCommand.ts";
import * as util from "./utils.ts";

export const commands: AiderCommand = {
  run,
  sendPrompt,
  exit,
  checkIfAiderBuffer,
  isTestMode,
};
/**
 * バッファがAiderバッファかどうかを確認します。
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>}
 */
async function checkIfAiderBuffer(denops: Denops, bufnr: number): Promise<boolean> {
  // aiderバッファの場合 `term://{path}//{pid}:aider --4o --no-auto-commits` のような名前になっている
  const name = await util.getBufferName(denops, bufnr);
  const splitted = name.split(" ");
  return splitted[0].endsWith("aider");
}

async function run(denops: Denops): Promise<undefined> {
  const aiderCommand = ensure(await v.g.get(denops, "aider_command"), is.String);
  await denops.cmd(`terminal ${aiderCommand}`);
  await emit(denops, "User", "AiderOpen");
}

/**
 * Aiderバッファにメッセージを送信します。
 * @param {Denops} denops - Denops instance
 * @param {number} jobId - The job id to send the message to
 * @param {string} prompt - The prompt to send
 * @returns {Promise<undefined>}
 */
async function sendPrompt(denops: Denops, jobId: number, prompt: string): Promise<undefined> {
  await v.r.set(denops, "q", prompt);
  await fn.feedkeys(denops, "G");
  await fn.feedkeys(denops, '"qp');
  await denops.call("chansend", jobId, "\n");
}

async function exit(denops: Denops, jobId: number, bufnr: number): Promise<undefined> {
  await denops.call("chansend", jobId, "/exit\n");
  await denops.cmd(`bdelete! ${bufnr}`);
}

function isTestMode(): boolean {
  return false;
}
