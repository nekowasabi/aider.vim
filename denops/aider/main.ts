import { relative } from "https://deno.land/std@0.115.1/path/mod.ts";
import * as fn from "https://deno.land/x/denops_std@v6.5.1/function/mod.ts";
import type { Denops } from "https://deno.land/x/denops_std@v6.5.1/mod.ts";
import * as buffer from "./bufferOperation.ts";
import type { BufferLayout } from "./bufferOperation.ts";
import { getCurrentFilePath } from "./utils.ts";

/**
 * The main function that sets up the Aider plugin functionality.
 * @param {Denops} denops - The Denops instance.
 * @returns {Promise<void>}
 */
export async function main(denops: Denops): Promise<void> {
  /**
   * コマンドの引数の数を定義
   * "0"は引数なし、"1"は1つの引数、"*"は複数の引数を意味します。
   */
  type ArgCount = "0" | "1" | "*";

  /**
   * ArgCountに基づいて異なる型の関数を定義
   * "0"の場合は引数なしの関数、"1"の場合は1つの引数を取る関数、
   * "*"の場合は2つの引数を取る関数を意味します。
   */
  type ImplType<T extends ArgCount> = T extends "0" ? () => Promise<void>
    : T extends "1" ? (arg: string) => Promise<void>
    : (arg: string, arg2: string) => Promise<void>; // MEMO: ArgCountは*だが現状2つのみ対応している

  /**
   * コマンドのオプションを定義
   * patternは引数のパターンを指定し、completeは補完の種類を指定し、
   * rangeは範囲指定が可能かどうかを示します。
   *
   * @property {string} [pattern] - 引数のパターンを指定します。
   * @property {("file" | "shellcmd")} [complete] - 補完の種類を指定します。ファイル補完またはシェルコマンド補完が可能です。
   * @property {boolean} [range] - 範囲指定が可能かどうかを示します。
   */
  type Opts<T extends ArgCount> = {
    pattern?: T extends "0" ? undefined
      : T extends "1" ? "[<f-args>]"
      : "[<line1>, <line2>]";
    complete?: T extends "1" ? "file" | "shellcmd" : undefined;
    range?: T extends "*" ? boolean : undefined;
  };

  /**
   * Commandは、メソッド名とその実装を含むコマンドオブジェクトを定義します。
   * @property {string} methodName - Denopsディスパッチャーで使用されるメソッド名
   * @property {ImplType<ArgCount>} impl - コマンドの実装関数
   */
  type Command = {
    methodName: string;
    impl: ImplType<ArgCount>;
  };

  /**
   * Denopsディスパッチャー用のコマンドと`command!`宣言を生成します。
   *
   * @param {string} dispatcherMethod - ディスパッチャーで使用されるメソッド名。Vim側に見えるコマンド名は Aider + DispatcherMethod のようになります。
   * @param {ImplType} impl - コマンドの実装関数。
   * @param {Opts} opts - オプション。フィールドはargCountによって変わるので型を参照。
   * @returns {Promise<Command>} - メソッド名、`command!`宣言、実装を含むコマンドオブジェクト。
   */
  async function command<argCount extends ArgCount>(
    dispatcherMethod: string,
    argCount: argCount,
    impl: ImplType<argCount>,
    opts: Opts<argCount> = {} as Opts<argCount>,
  ): Promise<Command> {
    const rangePart = opts.range ? "-range" : "";

    const commandName = `Aider${dispatcherMethod.charAt(0).toUpperCase()}${
      dispatcherMethod.slice(1)
    }`;
    const completePart = opts.complete ? `-complete=${opts.complete}` : "";
    const patternPart = opts.pattern ?? "[]";

    await denops.cmd(
      `command! -nargs=${argCount} ${completePart} ${rangePart} ${commandName} call denops#notify("${denops.name}", "${dispatcherMethod}", ${patternPart})`,
    );
    return {
      methodName: dispatcherMethod,
      impl: impl,
    };
  }

  /**
   * 現在のファイルをAiderに追加する関数
   * @param denops - Denopsインスタンス
   * @param openBufferType - バッファの開き方の設定
   * @param prefix - コマンドのプレフィックス ("add" または "read-only")
   * @param opts - オプション設定 (デフォルト: { openBuf: true })
   * @returns Promise<void>
   */
  async function addFileToAider(
    denops: Denops,
    openBufferType: BufferLayout,
    prefix: string,
    opts = { openBuf: true },
  ): Promise<void> {
    const currentBufnr = await fn.bufnr(denops, "%");
    const aiderBuffer = await buffer.getAiderBuffer(denops);

    if (!aiderBuffer) {
      await buffer.prepareAiderBuffer(denops, openBufferType);
    }

    if (await buffer.checkIfTerminalBuffer(denops, currentBufnr)) {
      return;
    }

    const currentFile = await getCurrentFilePath(denops);
    const prompt = `/${prefix} ${currentFile}`;
    await buffer.sendPrompt(denops, prompt, opts);
  }

  async function githubDeviceAuthImpl(): Promise<string | null> {
    const clientId = "Iv1.b507a08c87ecfe98";
    const scope = "read:user";
    const deviceAuthUrl = "https://github.com/login/device/code";
    const tokenUrl = "https://github.com/login/oauth/access_token";

    try {
      await denops.cmd('echomsg "Starting GitHub Device Authentication..."');

      // Step 1: Initiate Device Authorization
      const deviceAuthResponse = await fetch(deviceAuthUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Added for consistency, though spec only mentions Accept
          "Accept": "application/json",
        },
        body: JSON.stringify({ client_id: clientId, scope: scope }),
      });

      if (!deviceAuthResponse.ok) {
        const errorText = await deviceAuthResponse.text();
        await denops.cmd(
          `echomsg "Error initiating GitHub device flow: ${deviceAuthResponse.status} ${errorText}"`,
        );
        console.error(
          `Error initiating GitHub device flow: ${deviceAuthResponse.status}`,
          errorText,
        );
        return null;
      }

      const deviceAuthData = await deviceAuthResponse.json();
      const { device_code, user_code, verification_uri, expires_in, interval } =
        deviceAuthData;

      await denops.cmd(
        `echomsg "Please open your browser and go to: ${verification_uri}"`,
      );
      await denops.cmd(`echomsg "Enter this code: ${user_code}"`);

      // Step 2: Poll for Token
      let pollingInterval = interval * 1000; // Convert seconds to milliseconds
      const startTime = Date.now();
      const timeoutMs = expires_in * 1000;

      while (Date.now() - startTime < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, pollingInterval));

        try {
        // Inside the while loop's try {} block in githubDeviceAuthImpl
        const tokenResponse = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            client_id: clientId,
            device_code: device_code,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          }),
        });

        const responseBody = await tokenResponse.json(); // Parse JSON early

        if (tokenResponse.ok && responseBody.access_token) {
          // Genuine success: HTTP 2xx and access_token is present
          await denops.cmd(
            `echomsg "Successfully obtained GitHub access token: ${responseBody.access_token}"`,
          );
          console.log("Obtained GitHub Access Token:", responseBody.access_token);
          
          // Set environment variable and inform user
          Deno.env.set("OPENAI_API_KEY", responseBody.access_token);
          await denops.cmd('echomsg "GitHub token set to OPENAI_API_KEY for the current session."');
          
          return responseBody.access_token;
        } else if (responseBody.error) {
          // An error field is present in the response body
          // This handles cases where error might come with 2xx or non-2xx HTTP status
          if (responseBody.error === "authorization_pending") {
            await denops.cmd('echomsg "GitHub authorization pending..."');
            // Loop will continue due to no return statement here
          } else if (responseBody.error === "slow_down") {
            pollingInterval += 5000; // Assuming pollingInterval is defined in this scope
            await denops.cmd(
              `echomsg "Slowing down GitHub polling. New interval: ${
                pollingInterval / 1000
              }s"`,
            );
            // Loop will continue
          } else {
            // Any other error reported in the error field
            await denops.cmd(
              `echomsg "Error from GitHub token endpoint: ${responseBody.error} - ${
                responseBody.error_description || ""
              }"`,
            );
            console.error("Error from GitHub token endpoint:", responseBody);
            return null; // Exit polling
          }
        } else {
          // Neither a clear success (2xx + access_token) nor a clear error field.
          // This could be an unexpected response format.
          await denops.cmd(
            `echomsg "Unexpected response from GitHub token endpoint. Status: ${tokenResponse.status}"`,
          );
          console.error(
            "Unexpected response from GitHub token endpoint. Status:",
            tokenResponse.status,
            "Body:",
            responseBody,
          );
          return null; // Exit polling
        }
        } catch (pollError) {
          await denops.cmd(
            `echomsg "Network error during GitHub polling: ${pollError.message}"`,
          );
          console.error("Network error during GitHub polling:", pollError);
          // Potentially retry or backoff further depending on strategy, but for now, exit.
          return null;
        }
      }

      await denops.cmd(
        `echomsg "GitHub device flow timed out after ${expires_in} seconds."`,
      );
      console.error("GitHub device flow timed out.");
      return null;
    } catch (error) {
      await denops.cmd(`echomsg "An unexpected error occurred in GitHub device flow: ${error.message}"`);
      console.error("An unexpected error occurred in GitHub device flow:", error);
      return null;
    }
  }

  async function renewCopilotTokenImpl(): Promise<void> {
    try {
      const githubToken = Deno.env.get("OPENAI_API_KEY");

      if (!githubToken) {
        await denops.cmd(
          'echomsg "OPENAI_API_KEY environment variable is not set. Please run AiderDebugToken/AiderDebugTokenRefresh first, or set it manually."',
        );
        return;
      }

      await denops.cmd(
        'echomsg "Found OPENAI_API_KEY. Attempting to renew Copilot session token..."',
      );

      const copilotTokenUrl = "https://api.github.com/copilot_internal/v2/token";
      try {
        const response = await fetch(copilotTokenUrl, {
          method: "GET",
          headers: {
            "Authorization": `token ${githubToken}`,
            "User-Agent": "Aider.vim/0.1.0",
            "Accept": "application/json",
            "Editor-Plugin-Version": "Aider.vim/0.1.0",
            "Editor-Version": "Vim/Denops",
          },
        });

        if (response.ok) {
          const responseData = await response.json();
          if (responseData.token && responseData.expires_at) {
            await denops.cmd(
              'echomsg "Successfully renewed Copilot session token."',
            );
            await denops.cmd(
              `echomsg "New Copilot Session Token: ${responseData.token}"`,
            );
            await denops.cmd(
              `echomsg "Expires At: ${
                new Date(responseData.expires_at * 1000).toISOString()
              }"`,
            );
            console.log("Renewed Copilot Session Token Data:", responseData);
          } else {
            const errorText = await response.text(); // Or JSON.stringify(responseData)
            await denops.cmd(
              `echomsg "Error renewing Copilot token: Response format unexpected. Status: ${response.status} Body: ${errorText}"`,
            );
            console.error(
              "Error renewing Copilot token: Response format unexpected.",
              response.status,
              responseData,
            );
          }
        } else {
          const errorText = await response.text();
          await denops.cmd(
            `echomsg "Error renewing Copilot token: ${response.status} ${errorText}"`,
          );
          console.error(
            "Error renewing Copilot token:",
            response.status,
            errorText,
          );
        }
      } catch (networkError) {
        await denops.cmd(
          `echomsg "Network error renewing Copilot token: ${networkError.message}"`,
        );
        console.error("Network error renewing Copilot token:", networkError);
      }
    } catch (e) {
      // Catch any unexpected errors in the outer try block of renewCopilotTokenImpl
      await denops.cmd(`echomsg "Unexpected error in renewCopilotTokenImpl: ${e.message}"`);
      console.error("Unexpected error in renewCopilotTokenImpl:", e);
    }
  }

  async function debugTokenRefreshImpl(): Promise<void> {
    try {
      await denops.cmd('echomsg "Attempting to refresh GitHub and Copilot tokens..."');

      let githubAccessToken = Deno.env.get("OPENAI_API_KEY");

      if (githubAccessToken) {
        await denops.cmd('echomsg "Using OPENAI_API_KEY from environment."');
      } else {
        await denops.cmd('echomsg "Starting GitHub Device Flow for token refresh..."');
        githubAccessToken = await githubDeviceAuthImpl();

        if (!githubAccessToken) {
          await denops.cmd('echomsg "GitHub device authentication failed. Cannot proceed to fetch Copilot token."');
          console.error("GitHub device authentication failed.");
          return;
        }
      }

      // Successfully obtained GitHub token, now fetch Copilot token
      await denops.cmd('echomsg "Fetching Copilot session token..."');
      const copilotTokenUrl = "https://api.github.com/copilot_internal/v2/token";

      try {
        const copilotTokenResponse = await fetch(copilotTokenUrl, {
                  method: "GET",
                  headers: {
                    "Authorization": `token ${githubAccessToken}`,
                    "User-Agent": "Aider.vim/0.1.0",
                    "Accept": "application/json",
                    "Editor-Plugin-Version": "Aider.vim/0.1.0",
                    "Editor-Version": "Vim/Denops",
                  },
                });

                if (copilotTokenResponse.ok) {
                  const copilotTokenData = await copilotTokenResponse.json();
                  await denops.cmd(
                    'echomsg "Successfully obtained Copilot session token."',
                  );
                  if (copilotTokenData.token && copilotTokenData.expires_at) {
                    await denops.cmd(
                      `echomsg "Copilot Session Token: ${copilotTokenData.token}"`,
                    );
                    await denops.cmd(
                      `echomsg "Expires At: ${
                        new Date(copilotTokenData.expires_at * 1000).toISOString()
                      }"`,
                    );
                    console.log("Copilot Session Token Data:", copilotTokenData);
                  } else {
                     await denops.cmd(
                      'echomsg "Copilot token data is incomplete or in unexpected format."',
                    );
                    console.warn("Copilot token data format unexpected:", copilotTokenData);
                  }
                } else {
                  const errorText = await copilotTokenResponse.text();
                  await denops.cmd(
                    `echomsg "Error fetching Copilot token: ${copilotTokenResponse.status} ${errorText}"`,
                  );
                  console.error(
                    `Error fetching Copilot token: ${copilotTokenResponse.status}`,
                    errorText,
                  );
                }
              } catch (copilotError) {
                await denops.cmd(
                  `echomsg "Network error fetching Copilot token: ${copilotError.message}"`,
                );
                console.error(
                  "Network error fetching Copilot token:",
                  copilotError,
                );
              }
    } catch (error) {
      // This top-level catch in debugTokenRefreshImpl might catch errors from githubDeviceAuthImpl if they weren't handled there,
      // or errors from the Copilot token fetching part if they somehow bypass its specific try-catch.
      // Or if githubDeviceAuthImpl itself throws an unexpected error not returning null.
      await denops.cmd(`echomsg "An overall error occurred in token refresh process: ${error.message}"`);
      console.error("An overall error occurred in token refresh process:", error);
    }
  }

  const commands: Command[] = [
    await command("sendPromptByBuffer", "0", async () => {
      await buffer.sendPromptByBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
    }),

    await command(
      "sendPromptByCommandline",
      "1",
      async (prompt: string) => {
        await buffer.sendPrompt(denops, prompt, { openBuf: true });
      },
      { pattern: "[<f-args>]" },
    ),

    await command(
      "silentSendPromptByCommandline",
      "1",
      async (prompt: string) => {
        await buffer.sendPrompt(denops, prompt, { openBuf: false });
        console.log(`Sent prompt: ${prompt}`);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("run", "0", async () => {
      await buffer.openAiderBuffer(
        denops,
        await buffer.getOpenBufferType(denops),
      );
    }),

    await command("silentRun", "0", () => buffer.silentRun(denops)),

    await command("hideVisualSelectFloatingWindow", "0", async () => {
      await buffer.hideVisualSelectFloatingWindow(denops);
    }),

    await command("hide", "0", async () => {
      await denops.cmd("fclose!");
      await denops.cmd("silent! e!");
    }),

    await command(
      "addFile",
      "1",
      async (path: string) => {
        const prompt = `/add ${path}`;

        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),

    await command("addBuffers", "0", async () => {
      const buffersPath = await buffer.getFileBuffers(denops);
      const prompt = `/add ${buffersPath}`;

      await buffer.sendPrompt(denops, prompt);
    }),

    await command("addCurrentFile", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "add",
      );
    }),

    await command("silentAddCurrentFile", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "add",
        { openBuf: false },
      );
      const currentFile = await getCurrentFilePath(denops);
      console.log(`Added ${currentFile} to Aider`);
    }),

    await command(
      "addFileReadOnly",
      "1",
      async (path: string) => {
        const prompt = `/read-only ${path}`;

        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "file" },
    ),

    await command("addCurrentFileReadOnly", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "read-only",
      );
    }),

    await command("silentAddCurrentFileReadOnly", "0", async () => {
      await addFileToAider(
        denops,
        await buffer.getOpenBufferType(denops),
        "read-only",
        {
          openBuf: false,
        },
      );
      const currentFile = await getCurrentFilePath(denops);
      console.log(`Added ${currentFile} to Aider read-only`);
    }),

    await command(
      "addWeb",
      "1",
      async (url: string) => {
        const prompt = `/web ${url}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("paste", "0", async () => {
      const prompt = "/paste";
      await buffer.sendPrompt(denops, prompt);
    }),

    await command("toggleCodeMode", "0", async () => {
      const prompt = "/chat-mode code";
      await buffer.sendPrompt(denops, prompt);
    }),

    await command("toggleArchitectMode", "0", async () => {
      const prompt = "/chat-mode architect";
      await buffer.sendPrompt(denops, prompt);
    }),

    await command(
      "ask",
      "1",
      async (question: string) => {
        const prompt = `/ask ${question}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]" },
    ),

    await command("exit", "0", async () => {
      const aiderBuffer = await buffer.getAiderBuffer(denops);
      if (aiderBuffer) {
        buffer.exitAiderBuffer(denops);
      }
    }),

    await command(
      "addPartialReadonlyContext",
      "*",
      async (start: string, end: string) => {
        const partialContextFile = await buffer
          .getPartialContextFilePath(
            denops,
            start,
            end,
          );
        const prompt = `/read-only ${partialContextFile}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    await command(
      "visualTextWithPrompt",
      "*",
      async (start: string, end: string) => {
        await buffer.openFloatingWindowWithSelectedCode(
          denops,
          start,
          end,
          await buffer.getOpenBufferType(denops),
        );
      },
      { pattern: "[<line1>, <line2>]", range: true },
    ),

    await command("openIgnore", "0", async () => {
      const gitRoot = (await fn.system(denops, "git rev-parse --show-toplevel"))
        .trim();
      const filePathToOpen = `${gitRoot}/.aiderignore`;
      if (await fn.filereadable(denops, filePathToOpen)) {
        await denops.cmd(`edit ${filePathToOpen}`);
        return;
      }
      console.log(".aiderignore file not found.");
    }),

    await command("addIgnoreCurrentFile", "0", async () => {
      try {
        const currentFile = await getCurrentFilePath(denops);
        const gitRoot =
          (await fn.system(denops, "git rev-parse --show-toplevel"))
            .trim();
        const filePathToOpen = `${gitRoot}/.aiderignore`;
        const relativePath = relative(gitRoot, currentFile);

        const fileContent = await fn.readfile(denops, filePathToOpen);
        fileContent.push(`!${relativePath}`);
        await fn.writefile(denops, fileContent, filePathToOpen);
        console.log(`Added ${currentFile} to .aiderignore`);
      } catch (error) {
        console.error("Failed to add file to .aiderignore:", error);
      }
    }),

    /**
     * 音声入力コマンドを実行する
     * @async
     * @function
     * @throws {Error} 音声コマンドの実行に失敗した場合にスロー
     * @description
     * 1. Aiderバッファを準備
     * 2. /voiceコマンドを送信
     * 3. 挿入モードに切り替えて音声入力を受け付ける
     */
    await command("voice", "0", async () => {
      try {
        const prompt = "/voice";
        await buffer.prepareAiderBuffer(
          denops,
          await buffer.getOpenBufferType(denops),
        );
        await buffer.sendPrompt(denops, prompt);
        await fn.feedkeys(denops, "a"); // エンターキーを受け付けるため挿入モードを開始
      } catch (error) {
        console.error("音声コマンドの実行に失敗しました:", error);
      }
    }),

    /**
     * テストコマンドを実行する
     * @async
     * @function
     * @param {string} cmd - 実行するテストコマンド
     * @description
     * 1. 指定されたテストコマンドをAiderに送信
     * 2. シェルコマンドの補完をサポート
     */
    await command(
      "test",
      "1",
      async (cmd: string) => {
        const prompt = `/test ${cmd}`;
        await buffer.sendPrompt(denops, prompt);
      },
      { pattern: "[<f-args>]", complete: "shellcmd" },
    ),

    await command(
      "debugToken",
      "0",
      githubDeviceAuthImpl,
    ),

    await command(
      "debugTokenRefresh",
      "0",
      debugTokenRefreshImpl,
    ),

    await command(
      "renewCopilotToken",
      "0",
      renewCopilotTokenImpl,
    ),
  ];

  denops.dispatcher = Object.fromEntries(
    commands.map((
      command,
    ) => [
      command.methodName,
      command.impl as (args: unknown) => Promise<void>,
    ]),
  );
}
