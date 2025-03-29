import { assert } from "https://deno.land/std@0.217.0/assert/assert.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import * as buffer from "../denops/aider/bufferOperation.ts";

export const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

/**
 * Aiderバッファが開かれており、ウィンドウに表示されているかをアサートします
 */
export async function assertAiderBufferShown(denops: Denops): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(
    buf !== undefined,
    `Aider buffer is not defined.\n${await bufferStateMessage(denops)}`,
  );
  assert(
    buf.winnr !== undefined,
    `Aider buffer is not shown in any window.\n${await bufferStateMessage(
      denops,
    )}`,
  );
}

/**
 * Aiderバッファがウィンドウに表示されていないことをアサートします
 */
export async function assertAiderBufferHidden(denops: Denops): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(
    buf !== undefined,
    `Aider buffer is not defined.\n${await bufferStateMessage(denops)}`,
  );
  assert(
    buf.winnr === undefined,
    `Aider buffer is shown in a window when it should be hidden.\n${await bufferStateMessage(
      denops,
    )}`,
  );
}

/**
 * Aiderバッファが開かれていることをアサートします
 */
export async function assertAiderBufferAlive(denops: Denops): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(
    buf !== undefined,
    `Aider buffer is not alive.\n${await bufferStateMessage(denops)}`,
  );
}

/**
 * Aiderバッファの内容が期待される文字列と一致することをアサートします
 *
 * @param denops - Denopsインスタンス。
 * @param expected - 期待されるバッファの内容。
 */
export async function assertAiderBufferString(
  denops: Denops,
  expected: string,
): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(buf !== undefined);
  const lines = ensure(
    await denops.call("getbufline", buf.bufnr, 1, "$"),
    is.ArrayOf(is.String),
  );
  const actual = lines.join("\n");
  assert(
    actual === expected,
    `Buffer content mismatch.\nExpected:\n${expected}\nActual:\n${actual}\n`,
  );
}

async function bufferStateMessage(denops: Denops): Promise<string> {
  const bufCount = ensure(await denops.call("bufnr", "$"), is.Number);
  let message = "";
  for (let i = 1; i <= bufCount; i++) {
    const bufnr = ensure(await denops.call("bufnr", i), is.Number);
    const bufname = ensure(await denops.call("bufname", bufnr), is.String);
    const bufwinnr = ensure(
      await denops.call("bufwinnr", bufnr),
      is.Number,
    );
    message += `${JSON.stringify({ bufwinnr, bufnr, bufname })}\n`;
  }
  return message;
}
