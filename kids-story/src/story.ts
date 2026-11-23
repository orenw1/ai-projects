import { AIMessage } from "@langchain/core/messages";

export const MAX_SUBJECT_LENGTH = 80;

// The system prompt sets rules for every run. The user prompt (in main) carries the subject.
export const DEFAULT_SYSTEM_PROMPT = `You write short, happy stories for young children (ages 4–8).

Rules:
- Write at most 5 sentences total.
- Use simple words and a warm, cheerful tone.
- End on a positive note.
- Do not include a title, labels, or metadata—only the story text.`;

export interface ParsedArgs {
  subject: string;
  systemPrompt: string;
  help?: boolean;
}

export function parseArgs(argv: string[], env: NodeJS.ProcessEnv = process.env): ParsedArgs {
  const args: ParsedArgs = { subject: "", systemPrompt: env.SYSTEM_PROMPT?.trim() || "" };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      return { subject: "", systemPrompt: "", help: true };
    }
    if (arg === "--system") {
      const value = argv[++i];
      if (!value) {
        throw new Error("--system requires a value");
      }
      args.systemPrompt = value;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    args.subject = args.subject ? `${args.subject} ${arg}` : arg;
  }

  return args;
}

export function validateSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) {
    throw new Error("Please provide a story subject (max 80 characters).");
  }
  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    throw new Error(
      `Subject is too long (${trimmed.length} chars). Keep it to ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    );
  }
  return trimmed;
}

// agent.invoke returns the whole conversation. The story is the last assistant message.
export function getStoryText(result: { messages?: any[] }): string {
  const messages = result?.messages ?? [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg instanceof AIMessage || msg?.type === "ai" || msg?.role === "assistant") {
      const content = typeof msg.content === "string" ? msg.content : String(msg.content ?? "");
      if (content.trim()) return content.trim();
    }
  }
  throw new Error("Agent returned no story text.");
}

