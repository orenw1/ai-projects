/**
 * RAG pipeline: load pricing TXT into memory and expose a retriever.
 * Uses in-memory vector store (MemoryVectorStore) for retrieval.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Document } from "@langchain/core/documents";
import type { VectorStoreRetriever } from "@langchain/core/vectorstores";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_PRICING_PATH = path.join(__dirname, "..", "data", "pricing.txt");

export type PricingRetriever = VectorStoreRetriever<MemoryVectorStore>;

export async function loadPricingFile(
  filePath: string = DEFAULT_PRICING_PATH,
): Promise<Document[]> {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(absolutePath, "utf-8");
  return [
    new Document({
      pageContent: content,
      metadata: { source: absolutePath },
    }),
  ];
}

export async function splitDocuments(
  documents: Document[],
  options: { chunkSize?: number; chunkOverlap?: number } = {},
): Promise<Document[]> {
  const { chunkSize = 800, chunkOverlap = 100 } = options;
  const result: Document[] = [];

  for (const doc of documents) {
    const text = doc.pageContent;
    const sections = text.split(/(?=\n## )|\n\n+/).filter((s) => s.trim());

    let current = "";
    for (const section of sections) {
      if (current.length + section.length > chunkSize && current.length > 0) {
        result.push(
          new Document({
            pageContent: current.trim(),
            metadata: { ...doc.metadata },
          }),
        );
        const overlap = current.slice(-chunkOverlap);
        current = overlap + "\n" + section;
      } else {
        current = (current ? current + "\n\n" : "") + section;
      }
    }
    if (current.trim()) {
      result.push(
        new Document({
          pageContent: current.trim(),
          metadata: { ...doc.metadata },
        }),
      );
    }
  }

  return result.length ? result : documents;
}

export async function buildPricingRAG(
  pricingFilePath: string = DEFAULT_PRICING_PATH,
  embeddingOptions: Record<string, unknown> = {},
): Promise<{ vectorStore: MemoryVectorStore; retriever: PricingRetriever }> {
  const docs = await loadPricingFile(pricingFilePath);
  const splitDocs = await splitDocuments(docs);

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing OPENROUTER_API_KEY. Copy .env.example to .env and add your key.",
    );
  }

  const embeddings = new OpenAIEmbeddings(
    {
      model: "openai/text-embedding-3-small",
      apiKey,
      ...embeddingOptions,
    },
    { basePath: "https://openrouter.ai/api/v1" },
  );

  const vectorStore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings,
  );
  const retriever = vectorStore.asRetriever({ k: 3 });

  return { vectorStore, retriever };
}

export async function getRelevantPricing(
  retriever: PricingRetriever,
  query: string,
  k = 6,
): Promise<Document[]> {
  const previousK = retriever.k;
  retriever.k = k;
  try {
    return await retriever.invoke(query);
  } finally {
    retriever.k = previousK;
  }
}
