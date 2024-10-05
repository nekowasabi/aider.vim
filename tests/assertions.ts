import { assert } from "https://deno.land/std@0.217.0/assert/assert.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as buffer from "../denops/aider/bufferOperation.ts";

export const sleep = (msec: number) =>
  new Promise((resolve) => setTimeout(resolve, msec));

/**
 * Aiderバッファが開かれており、ウィンドウに表示されているかをアサートします
 * うまく動いてない( ；´。 ｀；)
 */
export async function assertAiderBufferShown(denops: Denops): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(buf !== undefined);
  assert(buf.winnr !== undefined);
}

/**
 * Aiderバッファがウィンドウに表示されていないことをアサートします
 * うまく動いてない( ；´。 ｀；)
 */
export async function assertAiderBufferHidden(denops: Denops): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(buf !== undefined);
  assert(buf.winnr === undefined);
}

/**
 * Aiderバッファが開かれていることをアサートします
 */
export async function assertAiderBufferAlive(denops: Denops): Promise<void> {
  const buf = await buffer.getAiderBuffer(denops);
  assert(buf !== undefined);
}
