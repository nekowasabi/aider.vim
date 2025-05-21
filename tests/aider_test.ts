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
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || "GET";
    const headers = init?.headers as Record<string, string>;
    const body = init?.body ? JSON.parse(init.body as string) : {};

    if (url.includes("https://github.com/login/device/code")) {
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
    } else if (url.includes("https://github.com/login/oauth/access_token")) {
      assertEquals(method, "POST");
      assertEquals(headers["Accept"], "application/json");
      assertEquals(headers["Content-Type"], "application/json");
      assertEquals(body.client_id, mockClientId);
      assertEquals(body.device_code, "mock_device_code");
      assertEquals(body.grant_type, "urn:ietf:params:oauth:grant-type:device_code");

      if (fetchCallCount === 2) { // First poll
        return new Response(JSON.stringify({ error: "authorization_pending" }), { status: 200, headers: { 'Content-Type': 'application/json' }});
      } else if (fetchCallCount === 3) { // Second poll
        return new Response(JSON.stringify({
          access_token: "mock_access_token_value",
          token_type: "bearer",
          scope: "copilot",
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }
    }
    // Fallback for unexpected calls
    return new Response("Unexpected fetch call", { status: 500 });
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

    assertEquals(fetchCallCount, 3, "Fetch should be called 3 times (1 device, 2 poll)");

    // Assert messages
    assert(
      recordedCmdMessages.some(msg => msg.includes("Starting GitHub Device Flow")),
      "Initial message missing"
    );
    assert(
      recordedCmdMessages.some(msg => msg.includes("Please open your browser and go to: https://github.com/login/device")),
      "Verification URI message missing"
    );
    assert(
      recordedCmdMessages.some(msg => msg.includes("Enter this code: MOCK-USER-CODE")),
      "User code message missing"
    );
    assert(
      recordedCmdMessages.some(msg => msg.includes("Authorization pending...")),
      "Authorization pending message missing"
    );
    assert(
      recordedCmdMessages.some(msg => msg.includes("Access token obtained successfully: mock_access_token_value")),
      "Success token message missing"
    );

  } finally {
    globalThis.fetch = originalFetch;
    denops.cmd = originalDenopsCmd;
  }
});
