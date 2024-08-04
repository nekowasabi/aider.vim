import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.4.0/function/nvim/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { getTerminalBufferNr } from "./utils.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";

/**
 * Enum representing different buffer layout options.
 */
export const bufferLayouts = ["split", "vsplit", "floating"] as const;
export type BufferLayout = typeof bufferLayouts[number];

/**
 * Retrieves the buffer opening type from the global variable "aider_buffer_open_type".
 * split: horizontal split
 * vsplit: vertical split
 * floating: floating window
 */
export const buffer = {
  async getOpenBufferType(denops: Denops): Promise<BufferLayout> {
    return maybe(
      await v.g.get(denops, "aider_buffer_open_type"),
      is.LiteralOneOf(bufferLayouts),
    ) ?? "floating";
  },

  /**
   * Opens a floating window for the specified buffer.
   * The floating window is positioned at the center of the terminal.
   *
   * @param {Denops} denops - The Denops instance.
   * @param {number} bufnr - The buffer number.
   * @returns {Promise<void>}
   */
  async openFloatingWindow(
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
      title:
        "| normal mode > qq: quit, terminal mode > <Esc><Esc>: quit | visual mode > <CR>: send prompt |",
      relative: "editor",
      border: "double",
      width: floatWinWidth,
      height: floatWinHeight,
      row: row,
      col: col,
    });
    await n.nvim_buf_set_keymap(
      denops,
      bufnr,
      "t",
      "<Esc>",
      "<cmd>close!<cr>",
      {
        silent: true,
      },
    );
    await n.nvim_buf_set_keymap(
      denops,
      bufnr,
      "n",
      "q",
      "<cmd>close!<cr>",
      {
        silent: true,
      },
    );
    await n.nvim_buf_set_keymap(
      denops,
      bufnr,
      "n",
      "<Esc>",
      "<cmd>close!<cr>",
      {
        silent: true,
      },
    );

    await denops.cmd("set nonumber");
  },
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
   * @returns {Promise<void | undefined | boolean>}
   * @throws {Error} If openBufferType is an invalid value.
   */
  async openAiderBuffer(
    denops: Denops,
    openBufferType: BufferLayout,
  ): Promise<void | undefined | boolean> {
    const aiderBufnr = await getTerminalBufferNr(denops);
    if (aiderBufnr) {
      await this.openFloatingWindow(denops, aiderBufnr);
      return true;
    }

    if (openBufferType === "split" || openBufferType === "vsplit") {
      await denops.cmd(openBufferType);
      return;
    }

    const bufnr = ensure(
      await n.nvim_create_buf(denops, false, true),
      is.Number,
    );

    await this.openFloatingWindow(
      denops,
      bufnr,
    );

    return;
  },

  async sendPromptFromFloatingWindow(denops: Denops): Promise<void> {
    const bufnr = await getTerminalBufferNr(denops);
    if (bufnr === undefined) {
      return;
    }
    await this.openFloatingWindow(denops, bufnr);

    await feedkeys(denops, "G");
    await feedkeys(denops, '"qp');

    const jobId = ensure(
      await fn.getbufvar(denops, bufnr, "&channel"),
      is.Number,
    );

    await denops.call("chansend", jobId, "\n");
  },

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
  async sendPromptFromSplitWindow(denops: Denops): Promise<void> {
    await identifyTerminalBuffer(denops, async (job_id, winnr, _bufnr) => {
      await denops.cmd(`bdelete!`);
      if (await v.g.get(denops, "aider_buffer_open_type") !== "floating") {
        await denops.cmd(`${winnr}wincmd w`);
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
      await feedkeys(denops, "G");
      await feedkeys(denops, '"qp');
      await denops.call("chansend", job_id, "\n");
      await denops.cmd("wincmd p");
    });
  },
};

/**
 * 開いているウィンドウの中からターミナルバッファを識別し、そのジョブID、ウィンドウ番号、バッファ番号をコールバック関数に渡します。
 *
 * @param {function} callback - ジョブID、ウィンドウ番号、バッファ番号を引数に取るコールバック関数
 * @returns {Promise<void>}
 */
async function identifyTerminalBuffer(
  denops: Denops,
  callback: (
    job_id: number | undefined,
    winnr?: number,
    bufnr?: number,
  ) => Promise<void>,
): Promise<void> {
  const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
  for (let i = 1; i <= win_count; i++) {
    const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);

    const bufType = await fn.getbufvar(denops, bufnr, "&buftype");
    if (bufType === "terminal") {
      const job_id = ensure<number>(
        await fn.getbufvar(denops, bufnr, "&channel"),
        is.Number,
      );
      if (job_id !== 0) {
        await callback(job_id, i, bufnr);
      }
    }
  }
}
