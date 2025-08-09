import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.5.1/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.18.1/mod.ts";

/**
 * Gets the additional prompt from vim global variable
 *
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string[] | undefined>} A promise that resolves to an array of additional prompts, or undefined if no prompts are found.
 */
export async function getPromptFromVimVariable(
  denops: Denops,
  variableName: string,
): Promise<string[] | undefined> {
  const prompts = maybe(
    await v.g.get(denops, variableName),
    is.ArrayOf(is.String),
  );
  return Array.isArray(prompts) ? prompts : undefined;
}

/**
 * Gets the current file path.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string>} A promise that resolves to the current file path.
 */
export async function getCurrentFilePath(denops: Denops): Promise<string> {
  const path = await fn.expand(denops, "%:p");
  return ensure(path, is.String);
}

/**
 * Gets the buffer name for a given buffer number.
 * @param {Denops} denops - The Denops instance.
 * @param {number} bufnr - The buffer number.
 * @returns {Promise<string>} A promise that resolves to the buffer name.
 * @throws {Error} Throws an error if the buffer name is not a string.
 */
export async function getBufferName(
  denops: Denops,
  bufnr: number,
): Promise<string> {
  const bufname = await fn.bufname(denops, bufnr);
  return ensure(bufname, is.String);
}

/**
 * Returns the recorded tmux pane id if present and non-empty.
 */
export async function getRegisteredTmuxPaneId(
  denops: Denops,
): Promise<string | undefined> {
  const paneId = maybe(await v.g.get(denops, "aider_tmux_pane_id"), is.String);
  if (paneId && paneId.length > 0) {
    return paneId;
  }
  return undefined;
}

/**
 * Returns the active tmux pane id if it is recorded and still exists.
 * If tmux existence cannot be verified (no tmux binary or not in tmux),
 * returns the recorded id to avoid breaking tests or non-tmux paths.
 */
export async function getActiveTmuxPaneId(
  denops: Denops,
): Promise<string | undefined> {
  const paneId = await getRegisteredTmuxPaneId(denops);
  if (!paneId) return undefined;

  const inTmux = (await denops.call("exists", "$TMUX")) === 1;
  const hasTmuxBinary = inTmux && (await fn.executable(denops, "tmux")) === 1;
  if (!hasTmuxBinary) {
    return paneId;
  }

  try {
    const output = String(
      await denops.call("system", "tmux list-panes -F '#{pane_id}'"),
    );
    const panes = output.trim().split("\n").filter(Boolean);
    return panes.includes(String(paneId)) ? paneId : undefined;
  } catch {
    return undefined;
  }
}
