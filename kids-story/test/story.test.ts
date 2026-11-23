import { test } from "node:test";
import assert from "node:assert/strict";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  DEFAULT_SYSTEM_PROMPT,
  MAX_SUBJECT_LENGTH,
  getStoryText,
  parseArgs,
  validateSubject,
} from "../src/story.js";

test("validateSubject trims whitespace", () => {
  assert.equal(validateSubject("  a happy bunny  "), "a happy bunny");
});

test("validateSubject rejects empty input", () => {
  assert.throws(() => validateSubject("   "), /provide a story subject/);
});

test("validateSubject accepts exactly the max length and rejects one more", () => {
  assert.equal(validateSubject("a".repeat(MAX_SUBJECT_LENGTH)).length, MAX_SUBJECT_LENGTH);
  assert.throws(() => validateSubject("a".repeat(MAX_SUBJECT_LENGTH + 1)), /too long/);
});

test("parseArgs joins multiple words into the subject", () => {
  assert.equal(parseArgs(["a", "friendly", "dragon"], {}).subject, "a friendly dragon");
});

test("parseArgs reads --system", () => {
  const args = parseArgs(["--system", "Be silly", "pirates"], {});
  assert.equal(args.systemPrompt, "Be silly");
  assert.equal(args.subject, "pirates");
});

test("parseArgs falls back to SYSTEM_PROMPT env var", () => {
  assert.equal(parseArgs(["cats"], { SYSTEM_PROMPT: " from env " }).systemPrompt, "from env");
});

test("parseArgs --system overrides the env var", () => {
  const args = parseArgs(["--system", "flag", "cats"], { SYSTEM_PROMPT: "env" });
  assert.equal(args.systemPrompt, "flag");
});

test("parseArgs handles --help and -h", () => {
  assert.equal(parseArgs(["--help"], {}).help, true);
  assert.equal(parseArgs(["-h"], {}).help, true);
});

test("parseArgs rejects unknown options and a missing --system value", () => {
  assert.throws(() => parseArgs(["--bogus"], {}), /Unknown option/);
  assert.throws(() => parseArgs(["--system"], {}), /requires a value/);
});

test("getStoryText returns the last non-empty assistant message, trimmed", () => {
  const result = {
    messages: [new HumanMessage("write a story"), new AIMessage("first"), new AIMessage("  The end.  ")],
  };
  assert.equal(getStoryText(result), "The end.");
});

test("getStoryText skips empty assistant messages and accepts plain-object roles", () => {
  assert.equal(
    getStoryText({ messages: [{ role: "assistant", content: "hi" }, new AIMessage("   ")] }),
    "hi",
  );
});

test("getStoryText throws when there is no assistant text", () => {
  assert.throws(() => getStoryText({ messages: [new HumanMessage("hi")] }), /no story text/);
  assert.throws(() => getStoryText({}), /no story text/);
});

test("default system prompt keeps the 5-sentence rule", () => {
  assert.match(DEFAULT_SYSTEM_PROMPT, /at most 5 sentences/);
});
