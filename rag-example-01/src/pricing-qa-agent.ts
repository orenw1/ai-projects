/**
 * Pricing Q&A agent: answers questions about construction/renovation pricing
 * using the RAG pipeline over data/pricing.txt.
 */

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
  buildPricingRAG,
  getRelevantPricing,
  type PricingRetriever,
} from "./rag-pipeline.js";

const SYSTEM_PROMPT = `You are a construction pricing assistant. You have access to a pricing reference document (constructor pricing per unit or per job).

Your task:
- Answer the user's question about construction or renovation costs using ONLY the provided pricing reference.
- If the question matches a line item, give the price or range and the unit (e.g. per linear metre, per m²).
- If the question is vague (e.g. "how much for a bathroom?"), list the relevant items from the reference (demolition, rough-in, finish, fixtures) and their ranges.
- If something has no matching line in the reference, say so and do not invent a number.
- Be concise and direct. Quote ranges exactly as in the reference when possible.
- If no answer or item in the pricing — answer with "I don't know - call Yakir and Shiran"`;

function createChatModel(): ChatOpenAI {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const modelId =
    process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini";

  if (openRouterKey) {
    return new ChatOpenAI({
      model: modelId,
      temperature: 0.1,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
      },
    });
  }

  if (openaiKey) {
    return new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
    });
  }

  throw new Error(
    "Set OPENAI_API_KEY or OPENROUTER_API_KEY in .env for the pricing Q&A agent.",
  );
}

function contentToText(
  content: string | Array<{ type: string; text?: string }>,
): string {
  if (typeof content === "string") return content;
  return content.map((c) => (c.type === "text" ? (c.text ?? "") : "")).join("");
}

export async function answerPricingQuestion(options: {
  question: string;
  retriever?: PricingRetriever;
  pricingFilePath?: string;
  k?: number;
}): Promise<string> {
  const { question, pricingFilePath, k = 6 } = options;
  let retriever = options.retriever;

  if (!retriever) {
    const built = await buildPricingRAG(pricingFilePath);
    retriever = built.retriever;
  }

  const docs = await getRelevantPricing(retriever, question, k);
  const pricingContext = docs.map((d) => d.pageContent).join("\n\n---\n\n");
  console.log("==================____PRICING CONTEXT_____========\n", pricingContext);

  const model = createChatModel();
  const messages = [
    new SystemMessage({
      content:
        SYSTEM_PROMPT +
        "\n\nPricing reference (excerpts):\n\n" +
        pricingContext,
    }),
    new HumanMessage({ content: question }),
  ];

  const response = await model.invoke(messages);
  return contentToText(
    response.content as string | Array<{ type: string; text?: string }>,
  );
}

export type PricingQAAgent = {
  retriever: PricingRetriever;
  answer: (question: string, k?: number) => Promise<string>;
};

export async function createPricingQAAgent(
  pricingFilePath?: string,
): Promise<PricingQAAgent> {
  const { retriever } = await buildPricingRAG(pricingFilePath);
  return {
    retriever,
    answer: (question, k = 1) =>
      answerPricingQuestion({ question, retriever, k }),
  };
}
