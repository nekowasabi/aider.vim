import { emit } from "https://deno.land/x/denops_std@v6.4.0/autocmd/mod.ts";
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
import * as aiderCommand from "./aiderCommand.ts";
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
	const buffer = await identifyAiderBuffer(denops);
	if (buffer === undefined) {
		return;
	}
	const { job_id, bufnr } = buffer;
	aiderCommand.exit(denops, job_id, bufnr);
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
 * @returns {Promise<void | undefined | boolean>}
 * @throws {Error} If openBufferType is an invalid value.
 */
export async function openAiderBuffer(
	denops: Denops,
	openBufferType: BufferLayout,
): Promise<undefined | boolean> {
	const aiderBufnr = await aiderCommand.getAiderBufferNr(denops);
	if (aiderBufnr && openBufferType === "floating") {
		await openFloatingWindow(denops, aiderBufnr);
		await emit(denops, "User", "AiderOpen");
		return true;
	}

	if (openBufferType === "split" || openBufferType === "vsplit") {
		if (aiderBufnr === undefined) {
			await denops.cmd(openBufferType);
			await emit(denops, "User", "AiderOpen");
		} else {
			await openSplitWindow(denops);
		}
		return;
	}

	const bufnr = ensure(await n.nvim_create_buf(denops, false, true), is.Number);

	await openFloatingWindow(denops, bufnr);

	await emit(denops, "User", "AiderOpen");
	return;
}

export async function sendPromptWithInput(
	denops: Denops,
	input: string,
): Promise<void> {
	const bufnr = await aiderCommand.getAiderBufferNr(denops);
	if (bufnr === undefined) {
		await denops.cmd("echo 'Aider is not running'");
		await denops.cmd("AiderRun");
		return;
	}

	const openBufferType = await getOpenBufferType(denops);

	if (openBufferType === "floating") {
		await openAiderBuffer(denops, openBufferType);
		await sendPromptFromFloatingWindow(denops, input);
		return;
	}

	await sendPromptFromSplitWindow(denops, input);
}

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

	await emit(denops, "User", "AiderOpen");
	return;
}

export async function openFloatingWindowWithSelectedCode(
	denops: Denops,
	start: unknown,
	end: unknown,
	openBufferType: BufferLayout,
): Promise<void> {
	const words = ensure(
		await denops.call("getline", start, end),
		is.ArrayOf(is.String),
	);
	if (openBufferType !== "floating") {
		const bufnr = await aiderCommand.getAiderBufferNr(denops);
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
 * 開いているウィンドウの中からAiderバッファを識別し、そのジョブID、ウィンドウ番号、バッファ番号を返します。
 *
 * @returns {Promise<{ job_id: number, winnr: number, bufnr: number }>}
 */
export async function identifyAiderBuffer(
	denops: Denops,
): Promise<{ job_id: number; winnr: number; bufnr: number } | undefined> {
	const win_count = ensure(await fn.winnr(denops, "$"), is.Number);
	for (let i = 1; i <= win_count; i++) {
		const bufnr = ensure(await fn.winbufnr(denops, i), is.Number);

		if (await aiderCommand.checkIfAiderBuffer(denops, bufnr)) {
			const job_id = ensure<number>(
				await fn.getbufvar(denops, bufnr, "&channel"),
				is.Number,
			);
			if (job_id !== 0) {
				return { job_id, winnr: i, bufnr };
			}
		}
	}
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
	const bufnr = await aiderCommand.getAiderBufferNr(denops);
	if (bufnr === undefined) {
		return;
	}
	await openFloatingWindow(denops, bufnr);

	const jobId = ensure(
		await fn.getbufvar(denops, bufnr, "&channel"),
		is.Number,
	);
	await aiderCommand.sendPrompt(denops, jobId, prompt);
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
	const aiderBuffer = await identifyAiderBuffer(denops);
	if (aiderBuffer === undefined) {
		return;
	}
	const { job_id, winnr } = aiderBuffer;

	if ((await v.g.get(denops, "aider_buffer_open_type")) !== "floating") {
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
	await aiderCommand.sendPrompt(denops, job_id, prompt);
}
