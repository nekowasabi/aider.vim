import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.7.1/file.ts";
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
          const result = await args.denops.call("system", "git ls-files");
          const files = result.split("\n").filter((file: string) =>
            file !== ""
          );
          const items: Item<ActionData>[] = files.map((file: string) => ({
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
