/**
 * Pricing Q&A CLI powered by RAG over data/pricing.txt.
 *
 * Usage:
 *   npm run dev -- "How much to remove a load-bearing wall?"
 *   npm run dev          # interactive: type questions, one per line
 *
 * Requires: OPENAI_API_KEY or OPENROUTER_API_KEY in .env
 */

import "dotenv/config";
import readline from "readline";
import { createPricingQAAgent } from "./pricing-qa-agent.js";

async function main() {
  const questionArg = process.argv[2];

  console.log("Loading RAG from data/pricing.txt...");
  const agent = await createPricingQAAgent();
  console.log("Pricing Q&A agent ready.\n");

  if (questionArg) {
    const answer = await agent.answer(questionArg);
    console.log("--- Answer ---\n");
    console.log(answer);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = () => {
    rl.question("Your question (or Ctrl+C to exit): ", async (line) => {
      const q = line?.trim();
      if (!q) {
        ask();
        return;
      }
      try {
        const answer = await agent.answer(q);
        console.log("\n--- Answer ---\n");
        console.log(answer);
        console.log("");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Error:", message);
      }
      ask();
    });
  };

  console.log("Ask anything about construction/renovation pricing. Examples:");
  console.log('  "How much to remove a bathroom?"');
  console.log('  "Cost to rebuild a wall per metre?"');
  console.log("");
  ask();
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
