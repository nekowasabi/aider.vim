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
    
    // Short sleep to allow all setTimeout(..., 0) in the polling loop to resolve.
    // The interval is 0 in mock, but setTimeout still defers execution.
    await sleep(50); // Increased slightly to be safer

    assertEquals(fetchCallCount, 4, "Fetch should be called 4 times (1 device, 2 GH poll, 1 Copilot poll)");

    // Assert messages in approximate order
    const expectedMessages = [
      "Starting GitHub Device Flow for token refresh...",
      "Please open your browser and go to: https://github.com/login/device",
      "Enter this code: MOCK-USER-CODE",
      "Authorization pending...",
      "GitHub Access Token obtained successfully: mock_access_token_value",
      "Fetching Copilot session token...",
      "Successfully obtained Copilot session token.",
      "Copilot Session Token: mock_copilot_session_token_value",
      "Expires At: 2023-03-15T12:00:00.000Z",
    ];

    assertEquals(recordedCmdMessages.length, expectedMessages.length, "Incorrect number of echomsg calls");
    expectedMessages.forEach((expectedMsg, index) => {
      assert(
        recordedCmdMessages[index].includes(expectedMsg),
        `Message at index ${index} ("${recordedCmdMessages[index]}") does not include expected content "${expectedMsg}"`,
      );
    });

  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
  }
});

test("both", "AiderDebugToken should perform device flow and display GitHub token", async (denops) => {
  const originalFetch = globalThis.fetch;
  const originalDenopsCmd = denops.cmd;

  let localFetchCallCount = 0;
  const localRecordedCmdMessages: string[] = [];
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

  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
  }
});
