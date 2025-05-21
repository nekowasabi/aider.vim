// This comment for vim-test plugin: Use denops' test() instead of built-in Deno.test()
import {
  assertAiderBufferHidden,
  assertAiderBufferShown,
  assertAiderBufferString,
  sleep,
} from "./assertions.ts";
import { assertAiderBufferAlive } from "./assertions.ts";
import { test } from "./testRunner.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const SLEEP_BEFORE_ASSERT = 100;

test("both", "AiderRun should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferShown(denops);
});

test("both", "AiderAddCurrentFile should work", async (denops) => {
  await denops.cmd("AiderAddCurrentFile");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  await assertAiderBufferString(denops, "input: /add \n");
});

test("both", "AiderSilentRun should work", async (denops) => {
  // TODO if nothing is open, aider buffer is shown on the window(subtle bug)
  await denops.cmd("e hoge.txt"); // open a buffer
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferHidden(denops);
});

test(
  "both",
  "AiderAddBuffers should return empty for files not under git management",
  async (denops) => {
    await denops.cmd("AiderRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("AiderAddBuffers");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferAlive(denops);
    await assertAiderBufferString(denops, "input: /add \n");
  },
);

test(
  "both",
  "AiderAddBuffers should return /add `bufferName` if there is a buffer under git management",
  async (denops) => {
    await denops.cmd("AiderRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("e ./tests/aider_test.ts");
    await denops.cmd("AiderAddBuffers");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferString(
      denops,
      "input: /add tests/aider_test.ts\n",
    );
  },
);

test("both", "AiderSendPromptByCommandline should work", async (denops) => {
  await denops.cmd("AiderRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  await sleep(SLEEP_BEFORE_ASSERT);
  await denops.cmd("AiderSendPromptByCommandline test");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferString(denops, "input: test\n");
});

test(
  "both",
  "AiderSilentSendPromptByCommandline should work",
  async (denops) => {
    await denops.cmd("AiderSilentRun");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferAlive(denops);
    await sleep(SLEEP_BEFORE_ASSERT);
    await denops.cmd("AiderSilentSendPromptByCommandline silent test");
    await sleep(SLEEP_BEFORE_ASSERT);
    await assertAiderBufferString(denops, "input: silent test\n");
  },
);

test("both", "AiderDebugTokenRefresh should perform device flow and display token", async (denops) => {
  const originalFetch = globalThis.fetch;
  const originalDenopsCmd = denops.cmd;

  let fetchCallCount = 0;
  const recordedCmdMessages: string[] = [];
  const mockClientId = "Iv1.b507a08c87ecfe98"; // Must match the one in main.ts

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    fetchCallCount++;
    let urlString: string;
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else { // Assumed to be a Request object
      urlString = input.url;
    }
    const method = init?.method || "GET";
    const headers = init?.headers as Record<string, string>;
    const body = init?.body ? JSON.parse(init.body as string) : {};

    if (urlString.includes("https://github.com/login/device/code")) {
      assertEquals(method, "POST");
      assertEquals(headers["Accept"], "application/json");
      assertEquals(headers["Content-Type"], "application/json");
      assertEquals(body.client_id, mockClientId);
      assertEquals(body.scope, "copilot");
      return new Response(JSON.stringify({
        device_code: "mock_device_code",
        user_code: "MOCK-USER-CODE",
        verification_uri: "https://github.com/login/device",
        expires_in: 5, // 5 seconds for test
        interval: 0, // Poll immediately for test
      }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } else if (urlString.includes("https://github.com/login/oauth/access_token")) {
      assertEquals(method, "POST");
      assertEquals(headers["Accept"], "application/json");
      assertEquals(headers["Content-Type"], "application/json");
      assertEquals(body.client_id, mockClientId);
      assertEquals(body.device_code, "mock_device_code");
      assertEquals(body.grant_type, "urn:ietf:params:oauth:grant-type:device_code");

      if (fetchCallCount === 2) { // First poll for GitHub token
        return new Response(JSON.stringify({ error: "authorization_pending" }), { status: 200, headers: { 'Content-Type': 'application/json' }});
      } else if (fetchCallCount === 3) { // Second poll for GitHub token - success
        return new Response(JSON.stringify({
          access_token: "mock_access_token_value",
          token_type: "bearer",
          scope: "copilot",
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }
    } else if (urlString.includes("https://api.github.com/copilot_internal/v2/token")) {
      assertEquals(fetchCallCount, 4, "Copilot token fetch should be the 4th call");
      assertEquals(method, "GET");
      assertEquals(headers["Authorization"], "token mock_access_token_value");
      assertEquals(headers["User-Agent"], "Aider.vim/0.1.0");
      assertEquals(headers["Accept"], "application/json");
      assertEquals(headers["Editor-Plugin-Version"], "Aider.vim/0.1.0");
      assertEquals(headers["Editor-Version"], "Vim/Denops");
      return new Response(JSON.stringify({
        token: "mock_copilot_session_token_value",
        expires_at: 1678886400, // 2023-03-15T12:00:00Z
        another_field: "test", // To ensure only expected fields are used
      }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    }
    // Fallback for unexpected calls
    return new Response(`Unexpected fetch call to ${urlString} (call count: ${fetchCallCount})`, { status: 500 });
  };

  denops.cmd = async (command: string, ...args: unknown[]): Promise<void> => {
    if (typeof command === 'string' && command.startsWith("echomsg")) {
      const msg = command.substring("echomsg ".length).replace(/^['"]|['"]$/g, "");
      recordedCmdMessages.push(msg);
    }
    // If other denops commands were used by the tested function, they would need to be handled here.
    // For AiderDebugTokenRefresh, it primarily uses echomsg.
    // Other commands used by the main plugin setup are not part of this specific command's logic.
    return Promise.resolve(); // Simulate successful execution for echomsg
  };
  globalThis.fetch = mockFetch;

  try {
    await denops.cmd("AiderDebugTokenRefresh");
    await sleep(50);
    assertEquals(fetchCallCount, 4, "Fetch should be called 4 times (1 device, 2 GH poll, 1 Copilot poll)");
    const requiredMessages = [
      "Starting GitHub Device Flow for token refresh...",
      "Please open your browser and go to: https://github.com/login/device",
      "Enter this code: MOCK-USER-CODE",
      "Authorization pending...",
      "GitHub Access Token obtained successfully: mock_access_token_value",
      "Successfully obtained Copilot session token.",
      "Copilot Session Token: mock_copilot_session_token_value"
    ];
    requiredMessages.forEach((exp) => {
      assert(recordedCmdMessages.some((m) => m.includes(exp)), `Expected message containing "${exp}" not found.`);
    });
  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
  }
});

test("both", "AiderDebugToken should perform device flow and display GitHub token", async (denops) => {
  const originalFetch = globalThis.fetch;
  const originalDenopsCmd = denops.cmd;
  const originalDenoEnvSet = Deno.env.set; // Store original Deno.env.set

  let localFetchCallCount = 0;
  const localRecordedCmdMessages: string[] = [];
  const denoEnvSetCalls: Array<{ key: string, value: string }> = []; // To record calls to Deno.env.set
  const mockClientId = "Iv1.b507a08c87ecfe98"; // Matches githubDeviceAuthImpl

  const mockFetchForGitHubDeviceAuth = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    localFetchCallCount++;
    let urlString: string;
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else { // Assumed to be a Request object
      urlString = input.url;
    }
    const method = init?.method || "GET";
    const headers = init?.headers as Record<string, string>;
    const body = init?.body ? JSON.parse(init.body as string) : {};

    if (urlString.includes("https://github.com/login/device/code")) {
      assertEquals(localFetchCallCount, 1, "Device code request should be the 1st call for AiderDebugToken");
      assertEquals(method, "POST");
      assertEquals(headers["Accept"], "application/json");
      assertEquals(headers["Content-Type"], "application/json");
      assertEquals(body.client_id, mockClientId);
      assertEquals(body.scope, "read:user"); // Specific scope for this flow
      return new Response(JSON.stringify({
        device_code: "mock_device_code_debugtoken",
        user_code: "MOCK-USER-CODE-DEBUGTOKEN",
        verification_uri: "https://github.com/login/device/debugtoken",
        expires_in: 5, 
        interval: 0, 
      }), { status: 200, headers: { 'Content-Type': 'application/json' }});
    } else if (urlString.includes("https://github.com/login/oauth/access_token")) {
      assertEquals(method, "POST");
      assertEquals(headers["Accept"], "application/json");
      assertEquals(headers["Content-Type"], "application/json");
      assertEquals(body.client_id, mockClientId);
      assertEquals(body.device_code, "mock_device_code_debugtoken");
      assertEquals(body.grant_type, "urn:ietf:params:oauth:grant-type:device_code");

      if (localFetchCallCount === 2) { // First poll for this test
        return new Response(JSON.stringify({ error: "authorization_pending" }), { status: 200, headers: { 'Content-Type': 'application/json' }});
      } else if (localFetchCallCount === 3) { // Second poll for this test - success
        return new Response(JSON.stringify({
          access_token: "mock_github_access_token_for_AiderDebugToken",
          token_type: "bearer",
          scope: "read:user",
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }
    }
    return new Response(`Unexpected fetch call in AiderDebugToken test to ${urlString} (call count: ${localFetchCallCount})`, { status: 500 });
  };

  const localDenopsCmdSpy = async (command: string, ...args: unknown[]): Promise<void> => {
    if (typeof command === 'string' && command.startsWith("echomsg")) {
      const msg = command.substring("echomsg ".length).replace(/^['"]|['"]$/g, "");
      localRecordedCmdMessages.push(msg);
    }
    return Promise.resolve();
  };

  // Spy on Deno.env.set
  Deno.env.set = (key: string, value: string): void => {
    denoEnvSetCalls.push({ key, value });
    originalDenoEnvSet.call(Deno.env, key, value); // Call original method
  };
  
  globalThis.fetch = mockFetchForGitHubDeviceAuth;
  denops.cmd = localDenopsCmdSpy;

  try {
    await denops.cmd("AiderDebugToken");
    await sleep(50); 

    assertEquals(localFetchCallCount, 3, "Fetch for AiderDebugToken should be called 3 times (1 device, 2 poll)");

    const expectedMessages = [
      "Starting GitHub Device Authentication...",
      "Please open your browser and go to: https://github.com/login/device/debugtoken",
      "Enter this code: MOCK-USER-CODE-DEBUGTOKEN",
      "GitHub authorization pending...",
      "Successfully obtained GitHub access token: mock_github_access_token_for_AiderDebugToken",
    ];
    
    assertEquals(localRecordedCmdMessages.length, expectedMessages.length, "Incorrect number of echomsg calls for AiderDebugToken");
    expectedMessages.forEach((expectedMsg, index) => {
      assert(
        localRecordedCmdMessages[index].includes(expectedMsg),
        `Message for AiderDebugToken at index ${index} ("${localRecordedCmdMessages[index]}") does not include expected content "${expectedMsg}"`,
      );
    });

    // Assert Deno.env.set call
    assert(
      denoEnvSetCalls.some(call => call.key === "OPENAI_API_KEY" && call.value === "mock_github_access_token_for_AiderDebugToken"),
      "Deno.env.set was not called correctly with OPENAI_API_KEY and the GitHub token."
    );
    assertEquals(denoEnvSetCalls.length, 1, "Deno.env.set should have been called once.");


  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
    Deno.env.set = originalDenoEnvSet; // Restore original Deno.env.set
    Deno.env.delete("OPENAI_API_KEY"); // Clean up environment variable
  }
});

test("both", "AiderRenewCopilotToken should notify if OPENAI_API_KEY is not set", async (denops) => {
  const originalDenopsCmd = denops.cmd;
  const localRecordedCmdMessages: string[] = [];

  Deno.env.delete("OPENAI_API_KEY"); // Ensure it's not set

  const localDenopsCmdSpy = async (command: string, ...args: unknown[]): Promise<void> => {
    if (typeof command === 'string' && command.startsWith("echomsg")) {
      const msg = command.substring("echomsg ".length).replace(/^['"]|['"]$/g, "");
      localRecordedCmdMessages.push(msg);
    }
    return Promise.resolve();
  };
  denops.cmd = localDenopsCmdSpy;

  try {
    await denops.cmd("AiderRenewCopilotToken");
    await sleep(10); // Give a moment for async operations

    assert(
      localRecordedCmdMessages.some(msg => 
        msg.includes("OPENAI_API_KEY environment variable is not set.") &&
        msg.includes("Please run AiderDebugToken/AiderDebugTokenRefresh first, or set it manually.")
      ),
      "Missing or incorrect notification when OPENAI_API_KEY is not set."
    );
    assertEquals(localRecordedCmdMessages.length, 1, "Expected only one message when OPENAI_API_KEY is not set.");

  } finally {
    denops.cmd = originalDenopsCmd;
  }
});

test("both", "AiderRenewCopilotToken should fetch Copilot token if OPENAI_API_KEY is set", async (denops) => {
  const originalFetch = globalThis.fetch;
  const originalDenopsCmd = denops.cmd;
  const originalOpenAIKey = Deno.env.get("OPENAI_API_KEY"); // Store original if any

  const mockGitHubToken = "gh_token_for_renew_test";
  Deno.env.set("OPENAI_API_KEY", mockGitHubToken);

  let fetchCallCount = 0;
  const localRecordedCmdMessages: string[] = [];

  const mockFetchForRenew = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    fetchCallCount++;
    let urlString: string;
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else { 
      urlString = input.url;
    }
    const method = init?.method || "GET";
    const headers = init?.headers as Record<string, string>;

    assertEquals(urlString, "https://api.github.com/copilot_internal/v2/token", "URL mismatch for Copilot token fetch");
    assertEquals(method, "GET", "Method mismatch for Copilot token fetch");
    assertEquals(headers["Authorization"], `token ${mockGitHubToken}`, "Authorization header mismatch");
    assertEquals(headers["User-Agent"], "Aider.vim/0.1.0", "User-Agent header mismatch");
    assertEquals(headers["Accept"], "application/json", "Accept header mismatch");
    assertEquals(headers["Editor-Plugin-Version"], "Aider.vim/0.1.0", "Editor-Plugin-Version header mismatch");
    assertEquals(headers["Editor-Version"], "Vim/Denops", "Editor-Version header mismatch");
    
    return new Response(JSON.stringify({
      token: "new_mock_copilot_session_token",
      expires_at: 1700000000, // Distinct timestamp
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  };

  const localDenopsCmdSpy = async (command: string, ...args: unknown[]): Promise<void> => {
    if (typeof command === 'string' && command.startsWith("echomsg")) {
      const msg = command.substring("echomsg ".length).replace(/^['"]|['"]$/g, "");
      localRecordedCmdMessages.push(msg);
    }
    return Promise.resolve();
  };

  globalThis.fetch = mockFetchForRenew;
  denops.cmd = localDenopsCmdSpy;

  try {
    await denops.cmd("AiderRenewCopilotToken");
    await sleep(50); // Allow async operations

    assertEquals(fetchCallCount, 1, "Fetch should be called once for AiderRenewCopilotToken");

    const expectedMessages = [
      "Found OPENAI_API_KEY. Attempting to renew Copilot session token...",
      "Successfully renewed Copilot session token.",
      "New Copilot Session Token: new_mock_copilot_session_token",
      `Expires At: ${new Date(1700000000 * 1000).toISOString()}`,
    ];

    assertEquals(localRecordedCmdMessages.length, expectedMessages.length, "Incorrect number of echomsg calls for AiderRenewCopilotToken");
    expectedMessages.forEach((expectedMsg, index) => {
      assert(
        localRecordedCmdMessages[index].includes(expectedMsg),
        `Message for AiderRenewCopilotToken at index ${index} ("${localRecordedCmdMessages[index]}") does not include expected content "${expectedMsg}"`,
      );
    });

  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
    if (originalOpenAIKey === undefined) {
      Deno.env.delete("OPENAI_API_KEY");
    } else {
      Deno.env.set("OPENAI_API_KEY", originalOpenAIKey);
    }
  }
});

test("both", "AiderDebugTokenRefresh should use OPENAI_API_KEY if set", async (denops) => {
  const originalFetch = globalThis.fetch;
  const originalDenopsCmd = denops.cmd;
  const originalKey = Deno.env.get("OPENAI_API_KEY");

  const mockToken = "env_token_for_refresh";
  Deno.env.set("OPENAI_API_KEY", mockToken);

  let fetchCallCount = 0;
  const messages: string[] = [];

  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    fetchCallCount++;
    let urlString: string;
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else {
      urlString = input.url;
    }
    const method = init?.method || "GET";
    const headers = init?.headers as Record<string, string>;

    assertEquals(urlString, "https://api.github.com/copilot_internal/v2/token");
    assertEquals(method, "GET");
    assertEquals(headers["Authorization"], `token ${mockToken}`);

    return new Response(JSON.stringify({
      token: "new_session_token",
      expires_at: 1700000000
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});
  };

  const cmdSpy = async (command: string): Promise<void> => {
    if (typeof command === 'string' && command.startsWith("echomsg")) {
      const msg = command.substring("echomsg ".length).replace(/^['"]|['"]$/g, "");
      messages.push(msg);
    }
    return Promise.resolve();
  };

  globalThis.fetch = mockFetch;
  denops.cmd = cmdSpy;

  try {
    await denops.cmd("AiderDebugTokenRefresh");
    await sleep(50);

    assertEquals(fetchCallCount, 1, "Copilot token should be fetched once");

    const expectedMsgs = [
      "Using OPENAI_API_KEY from environment.",
      "Successfully obtained Copilot session token.",
      "Copilot Session Token: new_session_token"
    ];
    expectedMsgs.forEach((exp) => {
      assert(messages.some((m) => m.includes(exp)), `Expected message containing \"${exp}\" not found.`);
    });
  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
    if (originalKey === undefined) {
      Deno.env.delete("OPENAI_API_KEY");
    } else {
      Deno.env.set("OPENAI_API_KEY", originalKey);
    }
  }
});
