import type { ActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";
import type { Denops } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import {
  BaseSource,
  type DduOptions,
  type Item,
  type SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";

type Params = Record<never, never>;

export class Source extends BaseSource<Params> {
  override kind = "aider";

  override gather(args: {
    denops: Denops;
    options: DduOptions;
    sourceOptions: SourceOptions;
    sourceParams: Params;
    input: string;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream<Item<ActionData>[]>({
      async start(controller) {
        try {
          const result = ensure(
            await args.denops.call("system", "git ls-files"),
            is.String,
          );
          const files = result.split("\n").filter((file: string) =>
            file !== ""
          );
          const items: Item<ActionData>[] = files.map((
            file: string,
          ) => ({
            word: file,
            action: {
              path: file,
            },
          }));
          controller.enqueue(items);
        } catch (e: unknown) {
          console.error(e);
        }
        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
