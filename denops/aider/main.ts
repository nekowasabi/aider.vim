import {Denops} from "https://deno.land/x/denops_std@v5.0.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v5.0.0/function/mod.ts";
import * as n from "https://deno.land/x/denops_std@v6.1.0/function/nvim/mod.ts";

import * as v from "https://deno.land/x/denops_std@v5.2.0/variable/mod.ts";
import {ensure, is} from "https://deno.land/x/unknownutil@v3.14.0/mod.ts";
import {feedkeys} from "https://deno.land/x/denops_std@v6.1.0/function/mod.ts";

export async function main(denops: Denops): Promise<void> {
async function getCurrentFilePath(): Promise<string> {
return ensure(await fn.expand(denops, "%:p"), is.String);
}
async function splitWithDirection(): Promise<string> {
const splitDirection = ensure(
await v.g.get(denops, "aider_split_direction"),
is.String,
);
await denops.cmd(splitDirection ?? "split");
return splitDirection ?? "split";
}

async function forEachTerminalBuffer(
callback: (job_id: number, winnr?: number, bufnr?: number) => Promise<void>,
): Promise<void> {
const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
for (let i = 0; i <= win_count; i++) {
const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);
if (await fn.getbufvar(denops, bufnr, "&buftype") === "terminal") {
const job_id = ensure(
await fn.getbufvar(denops, bufnr, "&channel"),
is.Number,
);
if (job_id !== 0) {
await callback(job_id, i, bufnr);
}
}
}
}

denops.dispatcher = {
async runAider(): Promise<void> {
await splitWithDirection();
await this.runAiderCommand();
},
async sendPrompt(): Promise<void> {
await feedkeys(denops, 'ggVG"zy');
await forEachTerminalBuffer(async (job_id, winnr, _bufnr) => {
await denops.cmd(`bdelete!`);
await denops.cmd(`${winnr}wincmd w`);
await feedkeys(denops, "G");
await feedkeys(denops, '"zp');
await denops.call("chansend", job_id, "\n");
await denops.cmd("wincmd p");
});
},
async sendPromptWithInput(prompt: unknown): Promise<void> {
// promptが空なら何もしない
if (prompt === "") {
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
async runAiderCommand(): Promise<void> {
const currentFile = await getCurrentFilePath();
const aiderCommand = ensure(
await v.g.get(denops, "aider_command"),
is.String,
);
await denops.cmd(`terminal ${aiderCommand} ${currentFile}`);
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
const words = ensure(await denops.call("getline", start, end), is.Array);

// floatint window定義
const buf = await n.nvim_create_buf(denops, false, true);
// 画面中央に表示
const terminal_width = Math.floor(
ensure(await n.nvim_get_option(denops, "columns"), is.Number),
);
const terminal_height = Math.floor(
ensure(await n.nvim_get_option(denops, "lines"), is.Number),
);
const floatWinWidth = ensure(
await v.g.get(denops, "aider_floatwin_width"),
is.Number,
);
const floatWinHeight = ensure(
await v.g.get(denops, "aider_floatwin_height"),
is.Number,
);
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
await denops.cmd("set filetype=aider_prompt");

await n.nvim_buf_set_lines(denops, buf, -1, -1, true, words);
await n.nvim_buf_set_lines(denops, buf, 0, 1, true, []);
await n.nvim_buf_set_lines(denops, buf, -1, -1, true, [""]);

// ウインドウを閉じる
await n.nvim_buf_set_keymap(denops, buf, "n", "q", "<cmd>q!<cr>", {
silent: true,
});
// 入力された文字列をAiderSendPromptに渡す
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
`command! -nargs=0 AiderSendPrompt call denops#notify("${denops.name}", "sendPrompt", [])`,
);
await denops.cmd(
`command! -nargs=0 AiderSendPromptWithInput call denops#notify("${denops.name}", "sendPromptWithInput", [input("Prompt: ")])`,
);
await denops.cmd(
`command! -nargs=0 AiderRun call denops#notify("${denops.name}", "runAider", [])`,
);
await denops.cmd(
`command! -nargs=0 AiderAddCurrentFile call denops#notify("${denops.name}", "addCurrentFile", [])`,
);
await denops.cmd(
`command! -nargs=0 AiderExit call denops#notify("${denops.name}", "exitAider", [])`,
);
await denops.cmd(
`command! -nargs=* -range AiderVisualTextWithPrompt call denops#notify("${denops.name}", "selectedCodeWithPromptAider", [<line1>, <line2>])`,
);
}
