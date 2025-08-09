import { emit } from "https://deno.land/x/denops_std@v6.5.1/autocmd/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { ensure, is, maybe } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
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
async function checkIfAiderBuffer(
  denops: Denops,
  bufnr: number,
): Promise<boolean> {
  // aiderバッファの場合 `term://{path}//{pid}:aider --4o --no-auto-commits` のような名前になっている
  const name = await util.getBufferName(denops, bufnr);
  const splitted = name.split(" ");
  // MEMO: copilot.shでシェルスクリプトごしにAiderを起動しているが、バッファ名が異なってしまうため対処（実験的な機能）
  return splitted[0].endsWith("aider") || splitted[0].endsWith("copilot.sh");
}

async function run(denops: Denops): Promise<undefined> {
  const aiderCommand = ensure(
    await v.g.get(denops, "aider_command"),
    is.String,
  );

  // Detect buffer open type to decide between Vim terminal and tmux pane
  const openType = maybe(
    await v.g.get(denops, "aider_buffer_open_type"),
    is.LiteralOneOf(["split", "vsplit", "floating"] as const),
  ) ?? "floating";

  // If running inside tmux and openType is split/vsplit, create a new tmux pane and run aider there
  const inTmux = (await denops.call("exists", "$TMUX")) === 1;
  if (inTmux && (openType === "split" || openType === "vsplit")) {
    const splitFlag = openType === "vsplit" ? "-h" : "-v";

    // Resolve the user's shell and execute the aider command via `$SHELL -lc` to
    // ensure login/interactive environments (PATH, rcs) are loaded.
    const shellPath = (await denops.call("expand", "$SHELL")) as string | undefined;
    const safeShell = shellPath && shellPath.length > 0 ? shellPath : "/bin/sh";

    // Escape double quotes in the command to embed into a double-quoted string
    const escapedAiderCmd = aiderCommand.replaceAll('"', '\\"');

    // Use single quotes for tmux format string to avoid shell interpolation
    const cmd = [
      "tmux",
      "split-window",
      "-P",
      "-F",
      "'#{pane_id}'",
      splitFlag,
      safeShell,
      "-lc",
      `"${escapedAiderCmd}"`,
    ].join(" ");

    const paneId = ensure(await denops.call("system", cmd), is.String).trim();

    if (paneId) {
      await v.g.set(denops, "aider_tmux_pane_id", paneId);
      await emit(denops, "User", "AiderOpen");
      return;
    }
    // Fallback to Vim terminal if tmux split failed
  }

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
async function sendPrompt(
  denops: Denops,
  jobId: number,
  prompt: string,
): Promise<undefined> {
  // If tmux pane is registered, paste the prompt into the pane and send Enter
  const paneId = maybe(
    await v.g.get(denops, "aider_tmux_pane_id"),
    is.String,
  );
  if (paneId) {
    // Write prompt to a temp file to preserve newlines
    const tempFile = await Deno.makeTempFile({ prefix: "aider_prompt_" });
    await Deno.writeTextFile(tempFile, prompt);

    // Load the buffer and paste to the pane with bracketed paste, then press Enter
    await denops.call(
      "system",
      `tmux load-buffer -b aider_prompt ${tempFile} && tmux paste-buffer -t ${paneId} -b aider_prompt -p && tmux delete-buffer -b aider_prompt && tmux send-keys -t ${paneId} C-m`,
    );

    try {
      await Deno.remove(tempFile);
    } catch (_) {
      // ignore
    }
    return;
  }

  // Use terminal bracketed paste to send multi-line input safely,
  // then submit with a single Enter.
  const bracketedStart = "\x1b[200~";
  const bracketedEnd = "\x1b[201~";
  await denops.call("chansend", jobId, `${bracketedStart}${prompt}${bracketedEnd}`);
  await denops.call("chansend", jobId, "\n");
}

async function exit(
  denops: Denops,
  jobId: number,
  bufnr: number,
): Promise<undefined> {
  // If tmux pane is registered, send exit command to that pane
  const paneId = maybe(
    await v.g.get(denops, "aider_tmux_pane_id"),
    is.String,
  );
  if (paneId) {
    await denops.call(
      "system",
      `tmux send-keys -t ${paneId} "/exit" C-m`,
    );
    // Optionally kill the pane after sending exit
    await denops.call("system", `tmux kill-pane -t ${paneId}`);
    // Remove global to avoid stale pane references
    await v.g.del(denops, "aider_tmux_pane_id");
    return;
  }

  if (jobId !== 0) {
    await denops.call("chansend", jobId, "/exit\n");
  }
  await denops.cmd(`bdelete! ${bufnr}`);
}

function isTestMode(): boolean {
  return false;
}
