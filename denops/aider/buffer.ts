import { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as v from "https://deno.land/x/denops_std@v6.4.0/variable/mod.ts";
import {
  ensure,
  is,
  maybe,
} from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";

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
export async function getOpenBufferType(denops: Denops): Promise<BufferLayout> {
  return maybe(
    await v.g.get(denops, "aider_buffer_open_type"),
    is.LiteralOneOf(bufferLayouts),
  ) ?? "floating";
}
