import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.4.0/function/nvim/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { aider } from "./aiderCommand.ts";
import { getAdditionalPrompt } from "./utils.ts";

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
  return (
    maybe(
      await v.g.get(denops, "aider_buffer_open_type"),
      is.LiteralOneOf(bufferLayouts),
    ) ?? "floating"
  );
}

export async function exitAiderBuffer(denops: Denops): Promise<void> {
  const buffer = await getAiderBuffer(denops);
  if (buffer === undefined) {
    return;
  }
  aider().exit(denops, buffer.jobId, buffer.bufnr);
}

/**
 * Opens an Aider buffer.
 * If an Aider buffer is already open, it opens that buffer.
 * If no Aider buffer is open, it creates a new buffer and opens it.
 * The way the buffer is opened depends on the value of openBufferType.
 * If openBufferType is "split" or "vsplit", the buffer is opened in a split.
 * Otherwise, the buffer is opened in a floating window.
 *
 * @param {Denops} denops - The Denops instance.
 * @param {BufferLayout} openBufferType - The type of buffer to open.
 * @returns {Promise<undefined | boolean>}
 */
export async function openAiderBuffer(
  denops: Denops,
  aiderBuf: AiderBuffer | undefined,
  openBufferType: BufferLayout,
): Promise<undefined | boolean> {
  // TODO openBufferTypeで大きく分岐するようリファクタすべき
  // return typeもbooleanにできる
  if (aiderBuf && openBufferType === "floating") {
    await openFloatingWindow(denops, aiderBuf.bufnr);
    return true;
  }

  if (openBufferType === "split" || openBufferType === "vsplit") {
    if (aiderBuf === undefined) {
      await denops.cmd(openBufferType);
    } else {
      await openSplitWindow(denops);
    }
    return;
  }

  const bufnr = ensure(await n.nvim_create_buf(denops, false, true), is.Number);

  await openFloatingWindow(denops, bufnr);

  return;
}

export async function sendPromptWithInput(
  denops: Denops,
  input: string,
): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (aiderBuf === undefined) {
    await denops.cmd("echo 'Aider is not running'");
    await denops.cmd("AiderRun");
    return;
  }

  const openBufferType = await getOpenBufferType(denops);

  if (openBufferType === "floating") {
    await openAiderBuffer(denops, aiderBuf, openBufferType);
    await sendPromptFromFloatingWindow(denops, input);
    return;
  }

  await sendPromptFromSplitWindow(denops, input);
}

/** バッファ内の内容をプロンプトとして送信する
 */
export async function sendPromptByBuffer(
  denops: Denops,
  openBufferType: BufferLayout,
): Promise<void> {
  const bufferContent = ensure(
    await denops.call("getbufline", "%", 1, "$"),
    is.ArrayOf(is.String),
  ).join("\n");

  await denops.cmd("bdelete!");

  if (openBufferType === "floating") {
    await sendPromptFromFloatingWindow(denops, bufferContent);
  } else {
    await sendPromptFromSplitWindow(denops, bufferContent);
  }

  return;
}

export async function openFloatingWindowWithSelectedCode(
  denops: Denops,
  aiderBuf: AiderBuffer | undefined,
  start: unknown,
  end: unknown,
  openBufferType: BufferLayout,
): Promise<void> {
  const words = ensure(
    await denops.call("getline", start, end),
    is.ArrayOf(is.String),
  );
  if (openBufferType !== "floating") {
    if (aiderBuf === undefined) {
      await denops.cmd("echo 'Aider is not running'");
      await denops.cmd("AiderRun");
      return;
    }
  }

  const filetype = ensure(
    await fn.getbufvar(denops, "%", "&filetype"),
    is.String,
  );
  // biome-ignore lint: ignore useTemplate to avoid \`\`\`
  words.unshift("```" + filetype);
  words.push("```");

  const bufnr = ensure(await n.nvim_create_buf(denops, false, true), is.Number);
  await openFloatingWindow(denops, bufnr);

  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, words);
  await n.nvim_buf_set_lines(denops, bufnr, 0, 1, true, []);
  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, [""]);

  const additionalPrompt = await getAdditionalPrompt(denops);
  if (additionalPrompt) {
    await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, ["# rule"]);
    await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, additionalPrompt);
    await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, [""]);
  }
  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, ["# prompt"]);
  await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, [""]);
  await feedkeys(denops, "Gi");

  await n.nvim_buf_set_keymap(denops, bufnr, "n", "q", "<cmd>close!<cr>", {
    silent: true,
  });
  await n.nvim_buf_set_keymap(
    denops,
    bufnr,
    "n",
    "<cr>",
    "<cmd>AiderSendPrompt<cr>",
    {
      silent: true,
    },
  );
}

/**
 * バッファがターミナルバッファかどうかを確認します。
 * @param {Denops} denops - Denopsインスタンス
 * @param {number} bufnr - バッファ番号
 * @returns {Promise<boolean>}
 */
export async function checkIfTerminalBuffer(
  denops: Denops,
  bufnr: number,
): Promise<boolean> {
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
async function openFloatingWindow(
  denops: Denops,
  bufnr: number,
): Promise<void> {
  const terminal_width = Math.floor(
    ensure(await n.nvim_get_option(denops, "columns"), is.Number),
  );
  const terminal_height = Math.floor(
    ensure(await n.nvim_get_option(denops, "lines"), is.Number),
  );
  const floatWinHeight = ensure(
    await v.g.get(denops, "aider_floatwin_height"),
    is.Number,
  );
  const floatWinWidth = ensure(
    await v.g.get(denops, "aider_floatwin_width"),
    is.Number,
  );

  const row = Math.floor((terminal_height - floatWinHeight) / 2);
  const col = Math.floor((terminal_width - floatWinWidth) / 2);

  await n.nvim_open_win(denops, bufnr, true, {
    relative: "editor",
    border: "double",
    width: floatWinWidth,
    height: floatWinHeight,
    row: row,
    col: col,
  });

  await denops.cmd("set nonumber");
}
async function sendPromptFromFloatingWindow(
  denops: Denops,
  prompt: string,
): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (aiderBuf === undefined) {
    return;
  }
  await openFloatingWindow(denops, aiderBuf.bufnr);

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
 */
async function sendPromptFromSplitWindow(
  denops: Denops,
  prompt: string,
): Promise<void> {
  const aiderBuf = await getAiderBuffer(denops);
  if (aiderBuf === undefined) {
    return;
  }

  if ((await v.g.get(denops, "aider_buffer_open_type")) !== "floating") {
    await denops.cmd(`${aiderBuf.winnr}wincmd w`);
  } else {
    const totalWindows = ensure<number>(
      await denops.call("winnr", "$"),
      is.Number,
    );

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
export async function getAiderBuffer(
  denops: Denops,
): Promise<AiderBuffer | undefined> {
  // Get all open buffer numbers
  const buf_count = ensure(await fn.bufnr(denops, "$"), is.Number);

  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);

    if (await aider().checkIfAiderBuffer(denops, bufnr)) {
      const jobId = ensure(
        await fn.getbufvar(denops, bufnr, "&channel"),
        is.Number,
      );

      // testMode時はjobを走らせていないのでその場合は0でも許容
      // if the process is not running, kill the buffer and continue finding
      if (!aider().isTestMode() && jobId === 0) {
        await denops.cmd(`b ${bufnr}`);
        await denops.cmd("bdelete!");
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
 * バッファがウィンドウ上で開いているかどうかを確認します。
 */
async function checkBufferOpen(
  denops: Denops,
  bufnrToCheck: number,
): Promise<boolean> {
  const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
  for (let i = 1; i <= win_count; i++) {
    const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);
    if (bufnr === bufnrToCheck) {
      return true;
    }
  }
  return false;
}
