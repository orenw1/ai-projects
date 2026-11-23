/**
 * Example of the smallest possible LangChain agent.
 *
 * It has no tools, so the agent makes one model call and returns:
 * validate the input -> send system + user prompts -> read the reply.
 */
import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenRouter } from "@langchain/openrouter";
// import { ChatOpenAI } from "@langchain/openai";
import {
  DEFAULT_SYSTEM_PROMPT,
  MAX_SUBJECT_LENGTH,
  getStoryText,
  parseArgs,
  validateSubject,
} from "./story.js";


function usage() {
  console.log(`Usage: npm run agent -- "<subject>"

Write a short happy kids story (max 5 sentences) about the subject.

Options:
  --system "<text>"   Override the system prompt for this run
  --help              Show this help

Environment (.env):
  OPENROUTER_API_KEY   Required
  OPENROUTER_MODEL     Default: openai/gpt-5.5 (also try openai/gpt-5.4)
  SYSTEM_PROMPT        Optional default system prompt

Subject must be at most ${MAX_SUBJECT_LENGTH} characters.

Example:
  npm run agent -- "a bunny who loves carrots"
`);
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    usage();
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    console.error("Missing OPENROUTER_API_KEY. Copy .env.example to .env and add your key.");
    process.exit(1);
  }

  const subject = validateSubject(parsed.subject);
  const systemPrompt = (parsed.systemPrompt || DEFAULT_SYSTEM_PROMPT).trim();
  const modelId = process.env.OPENROUTER_MODEL?.trim() || "anthropic/claude-opus-5.5";
  console.log(modelId)

  // temperature 0.8 gives varied stories; maxTokens caps the length and cost of a reply.
  const model = new ChatOpenRouter({
    model: modelId,
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    temperature: 2,
    maxTokens: 400,
  });

  const agent = createAgent({
    model,
    tools: [],
    systemPrompt,
  });

  const userPrompt = `Write a short happy story for kids about: ${subject}`;

  console.log(`Model: ${modelId}`);
  console.log(`Subject: ${subject}\n`);

  const result = await agent.invoke({ // invoke agent 
    messages: [{ role: "user", content: userPrompt }],
  });
  // console.log(result)
  // console.log(JSON.stringify(result, null, 2))
  // debug mode print the whole conversation including the object 
  console.log(getStoryText(result));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
