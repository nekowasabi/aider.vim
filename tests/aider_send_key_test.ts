// Test for AiderSendKey and AiderSendChoice commands
import {
  assertAiderBufferAlive,
  assertAiderBufferString,
  sleep,
} from "./assertions.ts";
import { test } from "./testRunner.ts";

const SLEEP_BEFORE_ASSERT = 100;

test("both", "AiderSendKey should send single character", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Simulate sending 'y' key
  // Execute command asynchronously and then send key
  await denops.cmd("call timer_start(50, {-> feedkeys('y', 't')})");
  await denops.cmd("AiderSendKey");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert the character was sent
  await assertAiderBufferString(denops, "input: y");
});

test("both", "AiderSendKey should handle ESC cancellation", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Get initial buffer content
  const initialContent = await denops.call("getbufline", "%", 1, "$") as string[];
  
  // Simulate ESC key (char code 27)
  await denops.cmd("call timer_start(50, {-> feedkeys(\"\\<Esc>\", 't')})");
  await denops.cmd("AiderSendKey");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert nothing was sent (buffer content unchanged)
  const afterContent = await denops.call("getbufline", "%", 1, "$") as string[];
  if (initialContent.join("\n") !== afterContent.join("\n")) {
    throw new Error("Buffer content changed when ESC was pressed");
  }
});

test("both", "AiderSendKey should handle Enter key", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Simulate Enter key
  await denops.cmd("call timer_start(50, {-> feedkeys(\"\\<CR>\", 't')})");
  await denops.cmd("AiderSendKey");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert newline was sent
  await assertAiderBufferString(denops, "input: \n");
});

test("both", "AiderSendChoice should accept valid characters", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Simulate sending 'y' which is valid for "ynA"
  await denops.cmd("call timer_start(50, {-> feedkeys('y', 't')})");
  await denops.cmd("AiderSendChoice ynA");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert the character was sent
  await assertAiderBufferString(denops, "input: y");
});

test("both", "AiderSendChoice should reject invalid characters", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Get initial buffer content
  const initialContent = await denops.call("getbufline", "%", 1, "$") as string[];
  
  // Simulate sending 'x' which is invalid for "ynA"
  await denops.cmd("call timer_start(50, {-> feedkeys('x', 't')})");
  await denops.cmd("AiderSendChoice ynA");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert nothing was sent (buffer content unchanged)
  const afterContent = await denops.call("getbufline", "%", 1, "$") as string[];
  if (initialContent.join("\n") !== afterContent.join("\n")) {
    throw new Error("Buffer content changed when invalid character was sent");
  }
});

test("both", "AiderSendChoice should handle uppercase characters", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Simulate sending 'A' which is valid for "ynA"
  await denops.cmd("call timer_start(50, {-> feedkeys('A', 't')})");
  await denops.cmd("AiderSendChoice ynA");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert the character was sent
  await assertAiderBufferString(denops, "input: A");
});

test("both", "AiderSendChoice should work with numbers", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Simulate sending '2' which is valid for "123"
  await denops.cmd("call timer_start(50, {-> feedkeys('2', 't')})");
  await denops.cmd("AiderSendChoice 123");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert the character was sent
  await assertAiderBufferString(denops, "input: 2");
});

test("both", "AiderSendChoice should handle ESC cancellation", async (denops) => {
  // Setup: Start Aider in silent mode
  await denops.cmd("AiderSilentRun");
  await sleep(SLEEP_BEFORE_ASSERT);
  await assertAiderBufferAlive(denops);
  
  // Get initial buffer content
  const initialContent = await denops.call("getbufline", "%", 1, "$") as string[];
  
  // Simulate ESC key
  await denops.cmd("call timer_start(50, {-> feedkeys(\"\\<Esc>\", 't')})");
  await denops.cmd("AiderSendChoice ynA");
  await sleep(SLEEP_BEFORE_ASSERT);
  
  // Assert nothing was sent (buffer content unchanged)
  const afterContent = await denops.call("getbufline", "%", 1, "$") as string[];
  if (initialContent.join("\n") !== afterContent.join("\n")) {
    throw new Error("Buffer content changed when ESC was pressed");
  }
});