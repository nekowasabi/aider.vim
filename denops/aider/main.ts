import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.4.0/function/nvim/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";

export async function main(denops: Denops): Promise<void> {
  enum BufferLayout {
    split = "split",
    vsplit = "vsplit",
    floating = "floating",
  }

  /**
   * グローバル変数 "aider_buffer_open_type" からバッファの開き方を取得します。
   * split: 横分割
   * vsplit: 縦分割
   * floating: フローティングウィンドウ
   */
  const openBufferType = await v.g.get(denops, "aider_buffer_open_type");

  async function getCurrentFilePath(): Promise<string> {
    return ensure(await fn.expand(denops, "%:p"), is.String);
  }

  // バッファの名前を取得するメソッド
  async function getBufferName(denops: Denops, bufnr: number): Promise<string> {
    const bufname = ensure(
      await fn.bufname(denops, bufnr),
      is.String,
    ) as string;
    return bufname;
  }

  // 新しいウィンドウを開くメソッド
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
    ) as number;
    const floatWinWidth = ensure(
      await v.g.get(denops, "aider_floatwin_width"),
      is.Number,
    ) as number;

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

  async function getAiderBufferNr(): Promise<number | undefined> {
    // 開いているすべてのbufnrを取得
    const buf_count = ensure(
      await fn.bufnr(denops, "$"),
      is.Number,
    ) as number;

    for (let i = 1; i <= buf_count; i++) {
      const bufnr = ensure(await fn.bufnr(denops, i), is.Number) as number;
      const bufname = await getBufferName(denops, bufnr);

      if (bufname.startsWith("term://")) {
        await openFloatingWindow(denops, bufnr);
        return bufnr;
      }
    }

    return;
  }

  async function openAiderBuffer(): Promise<void | undefined | boolean> {
    try {
      if (
        !Object.values(BufferLayout).includes(openBufferType as BufferLayout)
      ) {
        console.log("invalid split type.");
        throw new Error();
      }

      // Aiderバッファが既に開いている場合は、そのバッファを開く
      const aiderBufnr = await getAiderBufferNr();
      if (aiderBufnr) {
        await openFloatingWindow(denops, aiderBufnr);
        return true;
      }

      // AiderプロセスをopenBufferTypeに従って開く
      if (openBufferType === "split" || openBufferType === "vsplit") {
        await denops.cmd(openBufferType);
        return;
      }

      const bufnr = await n.nvim_create_buf(denops, false, true) as number;
      await openFloatingWindow(
        denops,
        bufnr,
      );

      return;
    } catch (e) {
      console.log(e);
      await denops.cmd("split");
    }
  }

  async function idenfityTerminalBuffer(
    callback: (
      job_id: number | undefined,
      winnr?: number,
      bufnr?: number,
    ) => Promise<void>,
  ): Promise<void> {
    const win_count = ensure(await fn.winnr(denops, "$"), is.Number) as number;
    for (let i = 1; i <= win_count; i++) {
      const bufnr = ensure(await fn.winbufnr(denops, i), is.Number) as number;

      const bufType = await fn.getbufvar(denops, bufnr, "&buftype") as string;
      if (bufType === "terminal") {
        const job_id = ensure(
          await fn.getbufvar(denops, bufnr, "&channel"),
          is.Number,
        ) as number;
        if (job_id !== 0) {
          await callback(job_id, i, bufnr);
        }
      }
    }
  }

  async function sendPromptFromSplitWindow() {
    await idenfityTerminalBuffer(async (job_id, winnr, _bufnr) => {
      await denops.cmd(`bdelete!`);
      if (await v.g.get(denops, "aider_buffer_open_type") !== "floating") {
        await denops.cmd(`${winnr}wincmd w`);
      } else {
        // Get the total number of windows
        const totalWindows = ensure(
          await denops.call("winnr", "$"),
          is.Number,
        ) as number;

        // Iterate over all windows
        for (let winnr = 1; winnr <= totalWindows; winnr++) {
          // Get the buffer number associated with the window
          const bufnr = await denops.call("winbufnr", winnr);

          // Get the 'buftype' of the buffer
          const buftype = await denops.call("getbufvar", bufnr, "&buftype");

          // If 'buftype' is 'terminal', move to that window and break the loop
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

  async function sendPromptFromFloatingWindow() {
    const bufnr = await getAiderBufferNr() as number;
    // await openFloatingWindow(denops, bufnr as number);

    await feedkeys(denops, "G");
    await feedkeys(denops, '"qp');

    const jobId = ensure(
      await fn.getbufvar(denops, bufnr, "&channel"),
      is.Number,
    );

    await denops.call("chansend", jobId, "\n");
  }

  async function getAiderWindowJobId(): Promise<number | undefined> {
    let jobId: number | undefined;
    await idenfityTerminalBuffer(async (job_id) => {
      // dummy operation
      await feedkeys(denops, "l");
      jobId = job_id;
    });
    return jobId;
  }

  denops.dispatcher = {
    async runAider(): Promise<void> {
      const exsitsAider = await openAiderBuffer();

      if (exsitsAider === true) {
        return;
      }
      await this.runAiderCommand();
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
      const bufnr = await getAiderBufferNr();
      if (bufnr === undefined) {
        await denops.cmd("echo 'Aider is not running'");
        await denops.cmd("AiderRun");
        return;
      }

      openBufferType === "floating"
        ? sendPromptFromFloatingWindow()
        : sendPromptFromSplitWindow();
    },
    async addCurrentFile(): Promise<void> {
      const currentFile = await getCurrentFilePath();
      const prompt = `/add ${currentFile}`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput(prompt);
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
    async runAiderCommand(): Promise<void> {
      const convention = await v.g.get(denops, "convension_path") ?? "";
      const currentFile = await getCurrentFilePath();
      const aiderCommand = ensure(
        await v.g.get(denops, "aider_command"),
        is.String,
      );
      await denops.cmd(`terminal ${aiderCommand} ${currentFile} ${convention}`);
    },
    async exit(): Promise<void> {
      const prompt = `/exit`;
      await v.r.set(denops, "q", prompt);
      await this.sendPromptWithInput();
    },
    async selectedCodeWithPrompt(
      start: unknown,
      end: unknown,
    ): Promise<void> {
      // TODO: クラスプロパティで使い回せないか？
      const words = ensure(
        await denops.call("getline", start, end),
        is.Array,
      ) as string[];
      if (openBufferType !== "floating") {
        const aiderWindowJobId = await getAiderWindowJobId();
        if (aiderWindowJobId === undefined) {
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

      const bufnr = await n.nvim_create_buf(denops, false, true) as number;
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
    `command! -nargs=0 AiderSendPromptWithInput call denops#notify("${denops.name}", "sendPromptWithInput", [input("Prompt: ")])`,
  );
  await denops.cmd(
    `command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider", [])`,
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
}
