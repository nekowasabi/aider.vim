import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.4.0/function/nvim/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { getTerminalBufferNr } from "./utils.ts";

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
};
