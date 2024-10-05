import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import * as util from "./utils.ts";

export interface AiderCommands {
  debug: typeof debug;
  run: typeof run;
  silentRun: typeof silentRun;
  sendPrompt: typeof sendPrompt;
  exit: typeof exit;
  checkIfAiderBuffer: typeof checkIfAiderBuffer;
}

export const commands: AiderCommands = {
  debug,
  run,
  silentRun,
  sendPrompt,
  exit,
  checkIfAiderBuffer,
};

/**
 * バッファがAiderバッファかどうかを確認します。
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>}
 */
async function checkIfAiderBuffer(
  denops: Denops,
  bufnr: number,
): Promise<boolean> {
  // aiderバッファの場合 `term://{path}//{pid}:aider --4o --no-auto-commits` のような名前になっている
  const name = await util.getBufferName(denops, bufnr);
  const splitted = name.split(" ");
  return splitted[0].endsWith("aider");
}

async function debug(denops: Denops): Promise<void> {
  await denops.cmd("b#");
}

async function run(denops: Denops): Promise<void> {
  const aiderCommand = ensure(
    await v.g.get(denops, "aider_command"),
    is.String,
  );
  await denops.cmd(`terminal ${aiderCommand}`);
}

/**
 * Aiderをバックグラウンドで実行します。
 * 新しいバッファを作成し、Aiderコマンドをターミナルで実行した後、
 * 前のバッファに戻ります。
 * @param {Denops} denops - Denopsインスタンス
 * @returns {Promise<void>}
 */
async function silentRun(denops: Denops): Promise<void> {
  await denops.cmd("enew");

  const aiderCommand = ensure(
    await v.g.get(denops, "aider_command"),
    is.String,
  );
  await denops.cmd(`terminal ${aiderCommand}`);

  await denops.cmd("b#");

  await denops.cmd("echo 'Aider is running in the background.'");
}

/**
 * Aiderバッファにメッセージを送信します。
 * @param {Denops} denops - Denops instance
 * @param {number} jobId - The job id to send the message to
 * @param {string} prompt - The prompt to send
 * @returns {Promise<void>}
 */
async function sendPrompt(
  denops: Denops,
  jobId: number,
  prompt: string,
): Promise<void> {
  await v.r.set(denops, "q", prompt);
  await fn.feedkeys(denops, "G");
  await fn.feedkeys(denops, '"qp');
  await denops.call("chansend", jobId, "\n");
}

async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<void> {
  await denops.call("chansend", jobId, "/exit\n");
  await denops.cmd(`bdelete! ${bufnr}`);
}
