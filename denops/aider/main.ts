import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.4.0/function/nvim/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { feedkeys } from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";

export async function main(denops: Denops): Promise<void> {
  async function getCurrentFilePath(): Promise<string> {
    return ensure(await fn.expand(denops, "%:p"), is.String);
  }

  // メソッド名がfloatingwindowを考慮してないのでリネーム
  async function splitWithDirection(): Promise<string> {
    let splitDirection: string | undefined;
    try {
      splitDirection = await v.g.get(denops, "aider_split_direction");
      if (typeof splitDirection !== "string") {
        throw new Error();
      }
    } catch {
      splitDirection = "split";
    }
    await denops.cmd(splitDirection);
    return splitDirection;
  }

  async function forEachTerminalBuffer(
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

  async function getAiderWindowJobId(): Promise<number | undefined> {
    let jobId: number | undefined;
    await forEachTerminalBuffer(async (job_id) => {
      // dummy operation
      await feedkeys(denops, "l");
      jobId = job_id;
    });
    return jobId;
  }

  denops.dispatcher = {
    async runAider(): Promise<void> {
      // floating window対応
      await splitWithDirection();

      // if aiderがバッファに存在する場合は、ウインドウを開く
      // elseは、aiderを起動する
      await this.runAiderCommand();
    },
    async restart(): Promise<void> {
      await this.exitAider();
      await this.runAider();
    },
    async sendPrompt(): Promise<void> {
      await feedkeys(denops, 'ggVG"qy');
      await forEachTerminalBuffer(async (job_id, winnr, _bufnr) => {
        await denops.cmd(`bdelete!`);
        await denops.cmd(`${winnr}wincmd w`);
        await feedkeys(denops, "G");
        await feedkeys(denops, '"qp');
        await denops.call("chansend", job_id, "\n");
        await denops.cmd("wincmd p");
      });
    },
    async sendPromptWithInput(prompt: unknown): Promise<void> {
      if (prompt === "") {
        return;
      }

      const aiderWindowJobId = await getAiderWindowJobId();
      if (aiderWindowJobId === undefined) {
        await denops.cmd("echo 'Aider is not running'");
        await denops.cmd("AiderRun");
        return;
      }

      const str = ensure(prompt, is.String) + "\n";
      await forEachTerminalBuffer(async (job_id, winnr) => {
        await denops.call("chansend", job_id, str);
        await denops.cmd(`${winnr}wincmd w`);
        await feedkeys(denops, "G");
        await denops.cmd("wincmd p");
      });
    },
    async addCurrentFile(): Promise<void> {
      const currentFile = await getCurrentFilePath();
      const prompt = `/add ${currentFile}`;
      await this.sendPromptWithInput(prompt);
    },
    async addFile(path: unknown): Promise<void> {
      if (path === "") {
        return;
      }
      const prompt = `/add ${path}`;
      await this.sendPromptWithInput(prompt);
    },
    async addWeb(url: unknown): Promise<void> {
      if (url === "") {
        return;
      }
      const prompt = `/web ${url}`;
      await this.sendPromptWithInput(prompt);
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
    async exitAider(): Promise<void> {
      await forEachTerminalBuffer(async (job_id, _winnr, bufnr) => {
        await denops.call("chansend", job_id, "/exit\n");
        await denops.cmd(`bdelete! ${bufnr}`);
      });
    },
    async selectedCodeWithPromptAider(
      start: unknown,
      end: unknown,
    ): Promise<void> {
      const words = ensure(
        await denops.call("getline", start, end),
        is.Array,
      ) as string[];
      const aiderWindowJobId = await getAiderWindowJobId();
      if (aiderWindowJobId === undefined) {
        await denops.cmd("echo 'Aider is not running'");
        await denops.cmd("AiderRun");
        return;
      }

      const filetype = ensure(
        await fn.getbufvar(denops, "%", "&filetype"),
        is.String,
      );
      words.unshift("```" + filetype);
      words.push("```");

      // floatint window定義
      const buf = await n.nvim_create_buf(denops, false, true) as number;
      // 画面中央に表示
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

      await n.nvim_open_win(denops, buf, true, {
        relative: "editor",
        border: "double",
        width: floatWinWidth,
        height: floatWinHeight,
        row: row,
        col: col,
      });
      await denops.cmd("setlocal buftype=nofile");
      await denops.cmd("set nonumber");
      await denops.cmd("set filetype=markdown");

      await n.nvim_buf_set_lines(denops, buf, -1, -1, true, words);
      await n.nvim_buf_set_lines(denops, buf, 0, 1, true, []);
      await n.nvim_buf_set_lines(denops, buf, -1, -1, true, [""]);

      await feedkeys(denops, "Gi");

      await n.nvim_buf_set_keymap(denops, buf, "n", "q", "<cmd>q!<cr>", {
        silent: true,
      });
      await n.nvim_buf_set_keymap(
        denops,
        buf,
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
    `command! -nargs=0 AiderRestart call denops#notify("${denops.name}", "restart", [])`,
  );
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
    `command! -nargs=0 AiderExit call denops#notify("${denops.name}", "exitAider", [])`,
  );
  await denops.cmd(
    `command! -nargs=* -range AiderVisualTextWithPrompt call denops#notify("${denops.name}", "selectedCodeWithPromptAider", [<line1>, <line2>])`,
  );
}
