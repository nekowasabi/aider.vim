import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.5.1/function/nvim/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import { ensure, is, maybe } from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";
import { aider } from "./aiderCommand.ts";
import { getCurrentFilePath, getPromptFromVimVariable } from "./utils.ts";

/**
 * Enum representing different buffer layout options.
 */
export const bufferLayouts = ["split", "vsplit", "floating"] as const;
export type BufferLayout = (typeof bufferLayouts)[number];

/**
 * Retrieves the buffer opening type from the global variable "aider_buffer_open_type".
 * split: horizontal split
 * vsplit: vertical split
 * floating: floating window
 */
export async function getOpenBufferType(denops: Denops): Promise<BufferLayout> {
  return maybe(await v.g.get(denops, "aider_buffer_open_type"), is.LiteralOneOf(bufferLayouts)) ?? "floating";
}

/**
 * すべてのAiderバッファを閉じ、関連するジョブを終了します
 *
 * @param {Denops} denops - Denopsインスタンス
 * @returns {Promise<void>} 処理が完了すると解決されるPromise
 */
export async function exitAiderBuffer(denops: Denops): Promise<void> {
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);

    if (await aider().checkIfAiderBuffer(denops, bufnr)) {
      const jobId = ensure(await fn.getbufvar(denops, bufnr, "&channel"), is.Number);
      aider().exit(denops, jobId, bufnr);
    }
  }
}

/**
 * Opens an Aider buffer.
 * If an Aider buffer is already alive, it opens that buffer.
 * If no Aider buffer is alive, it creates a new buffer and opens it.
 * The way the buffer is opened depends on the value of openBufferType.
 * If openBufferType is "split" or "vsplit", the buffer is opened in a split.
 * Otherwise, the buffer is opened in a floating window.
 *
 * @param {Denops} denops - The Denops instance.
 * @param {BufferLayout} openBufferType - The type of buffer to open.
 * @returns {Promise<undefined | boolean>}
 */
export async function openAiderBuffer(denops: Denops, openBufferType: BufferLayout): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (openBufferType === "floating") {
    if (aiderBuf === undefined) {
      const bufnr = ensure(await n.nvim_create_buf(denops, false, true), is.Number);
      await openFloatingWindow(denops, bufnr);
      await aider().run(denops);
      return;
    }
    if (aiderBuf !== undefined) {
      await openFloatingWindow(denops, aiderBuf.bufnr);
      return;
    }
  }

  if (openBufferType === "split" || openBufferType === "vsplit") {
    if (aiderBuf === undefined) {
      await denops.cmd(openBufferType);
    } else {
      await openSplitWindow(denops);
    }
    await aider().run(denops);
    return;
  }
}

/**
 * 新しいバッファでAiderをサイレント実行し、直前のバッファに戻る
 * ウィンドウレイアウトを変更せずにAiderバッファを作成する
 */
export async function silentRun(denops: Denops): Promise<void> {
  await denops.cmd("enew");
  await aider().run(denops);
  await denops.cmd("b#");
}
/**
 * Aiderバッファの準備処理
 * @param {BufferLayout} openBufferType - バッファオープンタイプ
 * @returns {Promise<void>}
 */
export async function prepareAiderBuffer(denops: Denops, openBufferType: BufferLayout): Promise<void> {
  if (openBufferType === "floating") {
    await silentRun(denops);
  } else {
    await openAiderBuffer(denops, openBufferType);
    await denops.cmd("wincmd p");
    console.log("Run Command again.");
    return;
  }
}

/**
 * プロンプトをAiderに送信する
 * @param {Denops} denops - Denopsインスタンス
 * @param {string} input - 送信するプロンプト内容
 * @param {Object} [opts] - オプション設定
 * @param {boolean} [opts.openBuf=true] - バッファを自動で開くかどうか
 * @returns {Promise<void>}
 */
export async function sendPrompt(denops: Denops, input: string, opts = { openBuf: true }): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (aiderBuf === undefined) {
    await denops.cmd("echo 'Aider is not running'");
    await denops.cmd("AiderRun");
    return;
  }

  const openBufferType = await getOpenBufferType(denops);

  if (openBufferType === "floating") {
    if (opts?.openBuf) {
      await openAiderBuffer(denops, openBufferType);
    }
    await sendPromptFromFloatingWindow(denops, input);
    return;
  }

  await sendPromptFromSplitWindow(denops, input);
}

/** バッファ内の内容をプロンプトとして送信する
 */
export async function sendPromptByBuffer(denops: Denops, openBufferType: BufferLayout): Promise<void> {
  const bufferContent = ensure(await denops.call("getbufline", "%", 1, "$"), is.ArrayOf(is.String)).join("\n");

  await denops.cmd("bdelete!");

  if (openBufferType === "floating") {
    await denops.cmd("AiderRun");
    await sendPromptFromFloatingWindow(denops, bufferContent);
  } else {
    await sendPromptFromSplitWindow(denops, bufferContent);
  }

  // aiderバッファの最下段へ移動（AiderVisualSelect用）
  await fn.feedkeys(denops, "G");
  return;
}

export async function openFloatingWindowWithSelectedCode(
  denops: Denops,
  start: unknown,
  end: unknown,
  openBufferType: BufferLayout,
): Promise<void> {
  const words = ensure(await denops.call("getline", start, end), is.ArrayOf(is.String));
  const aiderBuf = await getAiderBuffer(denops);
  if (openBufferType !== "floating") {
    if (aiderBuf === undefined) {
      await denops.cmd("echo 'Aider is not running'");
      await denops.cmd("AiderRun");
      return;
    }
  }
  const backupPrompt = await getPromptFromVimVariable(denops, "aider_visual_select_buffer_prompt");
  const bufnr = ensure(await n.nvim_create_buf(denops, false, true), is.Number);
  await openFloatingWindow(denops, bufnr);

  if (backupPrompt) {
    await handleBackupPrompt(denops, bufnr, backupPrompt);
  } else {
    await handleNoBackupPrompt(denops, bufnr, words);
  }

  await denops.cmd("setlocal filetype=markdown");

  await n.nvim_buf_set_keymap(denops, bufnr, "n", "Q", "<cmd>fclose!<CR>", {
    silent: true,
  });
  await n.nvim_buf_set_keymap(denops, bufnr, "n", "q", "<cmd>AiderHideVisualSelectFloatingWindow<CR>", {
    silent: true,
  });
  await n.nvim_buf_set_keymap(denops, bufnr, "n", "<cr>", "<cmd>AiderSendPromptByBuffer<cr>", {
    silent: true,
  });
}

/**
 * バックアッププロンプトを処理する
 *
 * この関数は、指定されたバッファにバックアッププロンプトの内容を設定し、
 * ビジュアルモードでの入力を開始します。
 *
 * @param {Denops} denops - Denopsインスタンス。
 * @param {number} bufnr - バッファ番号。
 * @param {string[]} backupPrompt - バックアッププロンプトの内容。
 */
async function handleBackupPrompt(denops: Denops, bufnr: number, backupPrompt: string[]) {
  await v.g.set(denops, "aider_visual_select_buffer_prompt", undefined);
  await n.nvim_buf_set_lines(denops, bufnr, 0, -1, true, backupPrompt);
  await feedkeys(denops, "Gi");
}

/**
 * バックアッププロンプトがない場合の処理を行います。
 *
 * この関数は、指定されたバッファにファイルタイプを含むコードブロックを設定し、
 * 必要に応じて追加のプロンプトを挿入します。
 *
 * @param {Denops} denops - Denopsインスタンス。
 * @param {number} bufnr - バッファ番号。
 * @param {string[]} words - バッファに設定するコード行。
 */
async function handleNoBackupPrompt(denops: Denops, bufnr: number, words: string[]) {
  const filetype = ensure(await fn.getbufvar(denops, "%", "&filetype"), is.String);
  // biome-ignore lint: ignore useTemplate to avoid \`\`\`
  words.unshift("```" + filetype);
  words.push("```");

  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, words);
  await n.nvim_buf_set_lines(denops, bufnr, 0, 1, true, []);
  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, [""]);

  const additionalPrompt = await getPromptFromVimVariable(denops, "aider_additional_prompt");
  if (additionalPrompt) {
    await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, ["# rule"]);
    await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, additionalPrompt);
    await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, [""]);
  }
  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, ["# prompt"]);
  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, [""]);
  await feedkeys(denops, "Gi");
}

export async function hideVisualSelectFloatingWindow(denops: Denops): Promise<void> {
  const bufferContent = ensure(await denops.call("getbufline", "%", 1, "$"), is.ArrayOf(is.String));
  await v.g.set(denops, "aider_visual_select_buffer_prompt", bufferContent);

  await denops.cmd("fclose!");
}

/**
 * バッファがターミナルバッファかどうかを確認します。
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>}
 */
export async function checkIfTerminalBuffer(denops: Denops, bufnr: number): Promise<boolean> {
  const buftype = await fn.getbufvar(denops, bufnr, "&buftype");
  return buftype === "terminal";
}

/**
 * スプリットウィンドウを開く
 *
 * @param {Denops} denops - Denopsインスタンス
 */
export async function openSplitWindow(denops: Denops): Promise<void> {
  await denops.cmd(await getOpenBufferType(denops));
}

/**
 * Opens a floating window for the specified buffer.
 * The floating window is positioned at the center of the terminal.
 *
 * @param {Denops} denops - The Denops instance.
 * @param {number} bufnr - The buffer number.
 * @returns {Promise<void>}
 */
async function openFloatingWindow(denops: Denops, bufnr: number): Promise<void> {
  const terminal_width = Math.floor(ensure(await n.nvim_get_option(denops, "columns"), is.Number));
  const terminal_height = Math.floor(ensure(await n.nvim_get_option(denops, "lines"), is.Number));
  const floatWinHeight = maybe(await v.g.get(denops, "aider_floatwin_height"), is.Number) || 20;
  const floatWinWidth = maybe(await v.g.get(denops, "aider_floatwin_width"), is.Number) || 100;
  const floatWinStyle = maybe(await v.g.set(denops, "aider_floatwin_style"), is.String) || "minimal";

  const row = Math.floor((terminal_height - floatWinHeight) / 2);
  const col = Math.floor((terminal_width - floatWinWidth) / 2);

  await n.nvim_open_win(denops, bufnr, true, {
    relative: "editor",
    border: "double",
    width: floatWinWidth,
    height: floatWinHeight,
    row: row,
    col: col,
    style: floatWinStyle,
  });

  await denops.cmd("set nonumber");
}
async function sendPromptFromFloatingWindow(denops: Denops, prompt: string): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (aiderBuf === undefined) {
    return;
  }

  await aider().sendPrompt(denops, aiderBuf.jobId, prompt);
}
/**
 * スプリットウィンドウからプロンプトを送信する非同期関数
 *
 * この関数は以下の操作を行います：
 * 1. ターミナルバッファを識別
 * 2. 現在のバッファを閉じる
 * 3. ターミナルウィンドウに移動
 * 4. カーソルを最後に移動
 * 5. レジスタ 'q' の内容を貼り付け
 * 6. Enter キーを送信
 * 7. 元のウィンドウに戻る
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {string} prompt - 送信するプロンプト
 */
async function sendPromptFromSplitWindow(denops: Denops, prompt: string): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (aiderBuf === undefined) {
    return;
  }

  if ((await v.g.get(denops, "aider_buffer_open_type")) !== "floating") {
    await denops.cmd(`${aiderBuf.winnr}wincmd w`);
  } else {
    const totalWindows = ensure<number>(await denops.call("winnr", "$"), is.Number);

    for (let winnr = 1; winnr <= totalWindows; winnr++) {
      const bufnr = await denops.call("winbufnr", winnr);

      const buftype = await denops.call("getbufvar", bufnr, "&buftype");

      if (buftype === "terminal") {
        await denops.cmd(`${winnr}wincmd w`);
        break;
      }
    }
  }
  await aider().sendPrompt(denops, aiderBuf.jobId, prompt);
}

type AiderBuffer = {
  jobId: number;
  winnr: number | undefined;
  bufnr: number;
};

/**
 * Gets the buffer number of the first buffer that matches the condition of checkIfAiderBuffer.
 * If no matching buffer is found, the function returns undefined.
 *
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<number | undefined>} The buffer number or undefined.
 */
export async function getAiderBuffer(denops: Denops): Promise<AiderBuffer | undefined> {
  // Get all open buffer numbers
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);
    if (bufnr === -1 || !(await fn.bufloaded(denops, bufnr))) {
      continue;
    }

    if (await aider().checkIfAiderBuffer(denops, bufnr)) {
      const jobId = ensure(await fn.getbufvar(denops, bufnr, "&channel"), is.Number);

      // testMode時はjobを走らせていないのでその場合は0でも許容
      // プロセスが動いていない場合(session復元時など)はバッファを削除
      if (!aider().isTestMode() && jobId === 0) {
        await denops.cmd(`bd! ${bufnr}`);
        continue;
      }

      if (await checkBufferOpen(denops, bufnr)) {
        const winnr = ensure(await fn.bufwinnr(denops, bufnr), is.Number);
        return { jobId, winnr, bufnr };
      }
      return { jobId, winnr: undefined, bufnr };
    }
  }

  return undefined;
}
/**
 * 指定されたバッファ番号が現在のウィンドウで開かれているかを確認します。
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnrToCheck - 確認したいバッファ番号
 * @returns {Promise<boolean>} バッファが開かれている場合はtrue、そうでない場合はfalse
 */
async function checkBufferOpen(denops: Denops, bufnrToCheck: number): Promise<boolean> {
  const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
  for (let i = 1; i <= win_count; i++) {
    const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);
    if (bufnr === bufnrToCheck) {
      return true;
    }
  }
  return false;
}

/**
 * Gitリポジトリのルートディレクトリを取得します。
 *
 * @param {Denops} denops - Denopsインスタンス
 * @returns {Promise<string>} Gitリポジトリのルートディレクトリのパス
 */
async function getGitRoot(denops: Denops): Promise<string> {
  const gitRoot = ensure(await denops.call("system", "git rev-parse --show-toplevel"), is.String).trim();
  return gitRoot;
}

/**
 * フルパスをGitリポジトリのルートからの相対パスに変換します。
 *
 * @param {Denops} denops - Denopsインスタンス
 * @param {string} fullPath - 変換するフルパス
 * @returns {Promise<string>} Gitリポジトリのルートからの相対パス
 */
async function convertToGitRelativePath(denops: Denops, fullPath: string): Promise<string> {
  const gitRoot = await getGitRoot(denops);
  return fullPath.replace(gitRoot, "").slice(1);
}

/**
 * Retrieves the paths of files under Git management in the currently open buffer.
 *
 * @param {Denops} denops - Denops instance
 * @returns {Promise<undefined | string>} A space-separated string of relative paths of files under Git management, or undefined
 */
export async function getFileBuffers(denops: Denops): Promise<undefined | string> {
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  const gitFiles = ensure(await denops.call("system", "git ls-files"), is.String).split("\n");

  const buffers = [];
  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);

    if (!(await aider().checkIfAiderBuffer(denops, bufnr))) {
      const bufferName = ensure(await fn.bufname(denops, bufnr), is.String);
      const fullPath = ensure(await fn.fnamemodify(denops, bufferName, ":p"), is.String);
      const gitRelativePath = await convertToGitRelativePath(denops, fullPath);

      if (gitFiles.includes(gitRelativePath)) {
        buffers.push(gitRelativePath);
      }
    }
  }

  return buffers.join(" ") ?? undefined;
}

/**
 * Saves the selected text to a temporary file and returns the file path.
 *
 * @param {Denops} denops - Denops instance
 * @param {string} start - The starting line of the selection range
 * @param {string} end - The ending line of the selection range
 * @returns {Promise<string>} The path to the temporary file
 */
export async function getPartialContextFilePath(denops: Denops, start: string, end: string): Promise<string> {
  const context = ensure(await denops.call("getline", start, end), is.ArrayOf(is.String));
  const filePath = ensure(await getCurrentFilePath(denops), is.String);

  const annotation = ensure([`// Path: ${filePath}`], is.ArrayOf(is.String));

  annotation.push(`// Filetype: ${ensure(await fn.getbufvar(denops, "%", "&filetype"), is.String)}`);

  annotation.push(`// Line: ${start}-${end}`);

  context.unshift(...annotation);

  const tempFile = ensure(await denops.call("tempname"), is.String);
  await Deno.writeTextFile(tempFile, context.join("\n"));

  // set filetype
  const fileType = ensure(await fn.getbufvar(denops, "%", "&filetype"), is.String);
  await denops.cmd(`setlocal filetype=${fileType}`);

  return tempFile;
}
