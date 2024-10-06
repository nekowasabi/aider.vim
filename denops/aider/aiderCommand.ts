import type { Denops } from "https://deno.land/x/denops_std@v6.4.0/mod.ts";
import * as actual from "./actualAiderCommand.ts";
import * as mock from "./mockAiderCommand.ts";

/**
 * Aiderコマンドの操作を定義するインターフェース。
 */
export interface AiderCommand {
  /**
   * Aiderコマンドを実行します。
   *
   * @param denops - Denopsインスタンス。
   * @returns コマンドが実行されたときに解決されるPromise。
   */
  run: (denops: Denops) => Promise<undefined>;

  /**
   * Aiderコマンドを静かに実行します。
   *
   * @param denops - Denopsインスタンス。
   * @returns コマンドが静かに実行されたときに解決されるPromise。
   */
  silentRun: (denops: Denops) => Promise<undefined>;

  /**
   * Aiderコマンドにプロンプトを送信します。
   *
   * @param denops - Denopsインスタンス。
   * @param jobId - ジョブ識別子。
   * @param prompt - 送信するプロンプト文字列。
   * @returns プロンプトが送信されたときに解決されるPromise。
   */
  sendPrompt: (
    denops: Denops,
    jobId: number,
    prompt: string,
  ) => Promise<undefined>;

  /**
   * Aiderコマンドを終了します。
   *
   * @param denops - Denopsインスタンス。
   * @param jobId - ジョブ識別子。
   * @param bufnr - バッファ番号。
   * @returns コマンドが終了したときに解決されるPromise。
   */
  exit: (denops: Denops, jobId: number, bufnr: number) => Promise<undefined>;

  /**
   * バッファがAiderバッファかどうかを確認します。
   *
   * @param denops - Denopsインスタンス。
   * @param bufnr - 確認するバッファ番号。
   * @returns Aiderバッファであるかどうかを示すブール値を解決するPromise。
   */
  checkIfAiderBuffer: (denops: Denops, bufnr: number) => Promise<boolean>;

  /**
   * Aiderがテストモードであるかどうかを判断します。
   *
   * @returns テストモードがアクティブであるかどうかを示すブール値。
   */
  isTestMode: () => boolean;
}

let testMode = false;

/**
 * Aiderのテストモードを有効にします。
 */
export const setTestMode = () => {
  testMode = true;
};

/**
 * 現在のモードに基づいて、適切なAiderコマンドを取得します。
 *
 * @returns アクティブなAiderコマンド。
 */
export const aider = () => {
  return testMode ? mock.commands : actual.commands;
};
