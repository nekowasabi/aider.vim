import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";
import { ensure, is } from "https://deno.land/x/unknownutil@v3.15.0/mod.ts";
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
    return new ReadableStream({
      async start(controller) {
        const tree = async () => {
          const items: Item<ActionData>[] = [];
          console.log(await args.denops.eval("expand('%')"));

          try {
            const a = "ok";
            items.push({
              word: a,
              action: {
                path: a,
                lineNr: 10,
              },
            });
          } catch (e: unknown) {
            console.error(e);
          }

          return items;
        };

        controller.enqueue(
          await tree(),
        );

        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
