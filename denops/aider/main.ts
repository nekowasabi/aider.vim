import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.4.0/function/nvim/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import { getCurrentFilePath, getTerminalBufferNr } from "./utils.ts";
import { aiderCommand } from "./aiderCommand.ts";
import { g } from "https://deno.land/x/denops_std@v6.4.0/variable/variable.ts";

/**
 * The main function that sets up the Aider plugin functionality.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>}
 */
export async function main(denops: Denops): Promise<void> {
  /**
   * Enum representing different buffer layout options.
   */

  const bufferLayouts = ["split", "vsplit", "floating"] as const;
  type BufferLayout = typeof bufferLayouts[number];

  /**
   * Retrieves the buffer opening type from the global variable "aider_buffer_open_type".
   * split: horizontal split
   * vsplit: vertical split
   * floating: floating window
   */
  const openBufferType: BufferLayout = maybe(
    await v.g.get(denops, "aider_buffer_open_type"),
    is.LiteralOneOf(bufferLayouts),
  ) ?? "floating";

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
  }

  /**
   * 非同期関数 openAiderBuffer は、Aiderバッファを開きます。
   * 既にAiderバッファが開いている場合は、そのバッファを開きます。
   * Aiderバッファが開いていない場合は、新たにバッファを作成し、それを開きます。
   * バッファの開き方は、openBufferType の値によります。
   * openBufferType が "split" または "vsplit" の場合、バッファは分割されて開きます。
   * それ以外の場合、バッファはフローティングウィンドウとして開きます。
   *
   * @returns {Promise<void | undefined | boolean>}
   * @throws {Error} openBufferType が無効な値の場合、エラーがスローされます。
   */
  async function openAiderBuffer(): Promise<void | undefined | boolean> {
    if (openBufferType === "split" || openBufferType === "vsplit") {
      await denops.cmd(openBufferType);
      return true;
    }

    const bufnr = ensure(
      await getTerminalBufferNr(denops) ??
        await n.nvim_create_buf(denops, false, true),
      is.Number,
    );

    await openFloatingWindow(
      denops,
      bufnr,
    );

    return true;
  }

  /**
   * 開いているウィンドウの中からターミナルバッファを識別し、そのジョブID、ウィンドウ番号、バッファ番号をコールバック関数に渡します。
   *
   * @param {function} callback - ジョブID、ウィンドウ番号、バッファ番号を引数に取るコールバック関数
   * @returns {Promise<void>}
   */
  async function identifyTerminalBuffer(
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
  async function sendPromptFromSplitWindow() {
    await identifyTerminalBuffer(async (job_id, winnr, _bufnr) => {
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
  }

  async function sendPromptFromFloatingWindow(): Promise<void> {
    const bufnr = await getTerminalBufferNr(denops);
    if (bufnr === undefined) {
      return;
    }
    await openFloatingWindow(denops, bufnr);

    await feedkeys(denops, "G");
    await feedkeys(denops, '"qp');

    const jobId = ensure(
      await fn.getbufvar(denops, bufnr, "&channel"),
      is.Number,
    );

    await denops.call("chansend", jobId, "\n");
  }

  denops.dispatcher = {
    async runAider(): Promise<void> {
      const exsitsAider = await openAiderBuffer();

      if (exsitsAider === true) {
        return;
      }
      await aiderCommand.run(denops);
    },
    async sendPrompt(): Promise<void> {
      // テキストを取得してプロンプト入力ウインドウを閉じる
      await feedkeys(denops, 'ggVG"qy');
      await denops.cmd("bdelete!");

      openBufferType === "floating"
        ? sendPromptFromFloatingWindow()
        : sendPromptFromSplitWindow();

      return;
    },
    async sendPromptWithInput(): Promise<void> {
      const bufnr = await getTerminalBufferNr(denops);
      if (bufnr === undefined) {
        await denops.cmd("echo 'Aider is not running'");
        await denops.cmd("AiderRun");
        return;
      }

      await openFloatingWindow(denops, bufnr);

      openBufferType === "floating"
        ? sendPromptFromFloatingWindow()
        : sendPromptFromSplitWindow();
    },
    async addCurrentFile(): Promise<void> {
      const bufnr = await fn.bufnr(denops, "%");
      if (await getTerminalBufferNr(denops) === undefined) {
        await this.silentRunAider();
      }
      const bufType = await fn.getbufvar(denops, bufnr, "&buftype");
      if (bufType === "terminal") {
        return;
      }
      const currentFile = await getCurrentFilePath(denops);
      const prompt = `/add ${currentFile}`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput();
    },
    async addFile(path: unknown): Promise<void> {
      if (path === "") {
        return;
      }
      const prompt = `/add ${path}`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput();
    },
    async addWeb(url: unknown): Promise<void> {
      if (url === "") {
        return;
      }
      const prompt = `/web ${url}`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput();
    },
    async exit(): Promise<void> {
      const bufnr = await getTerminalBufferNr(denops);
      if (bufnr !== undefined) {
        await denops.cmd(`${bufnr}bdelete!`);
      }
    },
    async openIgnore(): Promise<void> {
      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
        .trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      if (await fn.filereadable(denops, filePathToOpen)) {
        await denops.cmd(`edit ${filePathToOpen}`);
        return;
      }
      console.log("No .aiderignore file found.");
    },
    async debug(): Promise<void> {
      await aiderCommand.debug(denops);
    },
    async silentRunAider(): Promise<void> {
      await denops.cmd("enew");

      const aiderCommand = ensure(
        await v.g.get(denops, "aider_command"),
        is.String,
      );
      await denops.cmd(`terminal ${aiderCommand}`);

      await denops.cmd("b#");

      console.log("Aider is running in the background.");
    },
    async addIgnoreCurrentFile(): Promise<void> {
      const currentFile = await getCurrentFilePath(denops);

      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
        .trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      const forAiderIgnorePath = currentFile.replace(gitRoot, "");

      const file = await fn.readfile(denops, filePathToOpen);
      file.push(`!${forAiderIgnorePath}`);

      await fn.writefile(denops, file, filePathToOpen);
      console.log(`Added ${currentFile} to .aiderignore`);
    },
    async selectedCodeWithPrompt(
      start: unknown,
      end: unknown,
    ): Promise<void> {
      const words = ensure(
        await denops.call("getline", start, end),
        is.ArrayOf(is.String),
      );
      if (openBufferType !== "floating") {
        const bufnr = await getTerminalBufferNr(denops);
        if (bufnr === undefined) {
          await denops.cmd("echo 'Aider is not running'");
          await denops.cmd("AiderRun");
          return;
        }
      }

      const filetype = ensure(
        await fn.getbufvar(denops, "%", "&filetype"),
        is.String,
      );
      words.unshift("```" + filetype);
      words.push("```");

      const bufnr = ensure(
        await n.nvim_create_buf(denops, false, true),
        is.Number,
      );
      await openFloatingWindow(
        denops,
        bufnr,
      );

      await n.nvim_buf_set_lines(denops, bufnr, -1, -1, true, words);
      await n.nvim_buf_set_lines(denops, bufnr, 0, 1, true, []);
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
    },
  };

  await denops.cmd(
    `command! -nargs=0 AiderSendPrompt call denops#notify("${denops.name}", "sendPrompt", [])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider", [])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderSilentRun call denops#notify("${denops.name}", "silentRunAider", [])`,
  );
  await denops.cmd(
    `command! -nargs=1 AiderAddFile call denops#notify("${denops.name}", "addFile", [<f-args>])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderAddCurrentFile call denops#notify("${denops.name}", "addCurrentFile", [])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderAddWeb call denops#notify("${denops.name}", "addWeb", [input("URL: ")])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderExit call denops#notify("${denops.name}", "exit", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderVisualTextWithPrompt call denops#notify("${denops.name}", "selectedCodeWithPrompt", [<line1>, <line2>])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderOpenIgnore call denops#notify("${denops.name}", "openIgnore", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderAddIgnoreCurrentFile call denops#notify("${denops.name}", "addIgnoreCurrentFile", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderDebug call denops#notify("${denops.name}", "debug", [])`,
  );
}
