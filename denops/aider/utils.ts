import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.4.0/function/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";

/**
 * Gets the additional prompt from vim global variable "aider_additional_prompt".
 *
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<string>} A promise that resolves to the current file path.
 */
export async function getAdditionalPrompt(denops: Denops): Promise<string> {
  return ensure(await v.g.get(denops, "aider_additional_prompt"), is.String);
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
 * Gets the buffer number of the first buffer with a name starting with "term://".
 * If no matching buffer is found, the function returns undefined.
 *
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<number | undefined>} The buffer number or undefined.
 */
export async function getTerminalBufferNr(
  denops: Denops,
): Promise<number | undefined> {
  // Get all open buffer numbers
  const buf_count = ensure(
    await fn.bufnr(denops, "$"),
    is.Number,
  );

  for (let i = 1; i <= buf_count; i++) {
    const bufnr = ensure(await fn.bufnr(denops, i), is.Number);
    const bufname = await getBufferName(denops, bufnr);

    if (bufname.startsWith("term://")) {
      return bufnr;
    }
  }

  return undefined;
}
