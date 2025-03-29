import type { Denops } from "https://deno.land/x/ddu_vim@v3.10.2/deps.ts";

import {
  ActionFlags,
  type Actions,
  BaseKind,
  type Context,
  type DduItem,
  type PreviewContext,
  type Previewer,
} from "https://deno.land/x/ddu_vim@v3.10.2/types.ts";
import { is, maybe } from "https://deno.land/x/unknownutil@v3.15.0/mod.ts";

export type ActionData = {
  path: string;
  info?: string;
};

type Params = Record<never, never>;

const isDduItemAction = is.ObjectOf({ path: is.String });

export const BookmarkAction: Actions<Params> = {
  add: async (args: {
    denops: Denops;
    context: Context;
    actionParams: unknown;
    items: DduItem[];
  }) => {
    // 分割代入
    const { denops, items } = args;

    const paths = items
      .map((item) => {
        const action = maybe(item?.action, isDduItemAction);
        return action ? action.path : null;
      })
      .filter((path) => path !== null)
      .join(" ");

    if (paths) {
      await denops.cmd(`AiderAddFile ${paths}`);
    }

    return ActionFlags.None;
  },
  readOnly: async (args: {
    denops: Denops;
    context: Context;
    actionParams: unknown;
    items: DduItem[];
  }) => {
    const { denops, items } = args;

    const paths = items
      .map((item) => {
        const action = maybe(item?.action, isDduItemAction);
        return action ? action.path : null;
      })
      .filter((path) => path !== null)
      .join(" ");

    if (paths) {
      await denops.cmd(`AiderAddFileReadOnly ${paths}`);
    }

    return ActionFlags.None;
  },
  open: (_: {
    denops: Denops;
    context: Context;
    actionParams: unknown;
    items: DduItem[];
  }) => {
    // const action = args.items[0].action as { path: string };
    return ActionFlags.None;
  },
};

export class Kind extends BaseKind<Params> {
  override actions = BookmarkAction;
  override getPreviewer(args: {
    denops: Denops;
    item: DduItem;
    actionParams: unknown;
    previewContext: PreviewContext;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve({
      kind: "buffer",
      path: action.path,
    });
  }

  override params(): Params {
    return {};
  }
}
