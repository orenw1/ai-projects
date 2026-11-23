# Kids story agent

Simple LangChain agent that writes short, happy stories for kids (max 5 sentences) using OpenRouter.

## Prerequisites

- Node.js 18 or newer
- An [OpenRouter API key](https://openrouter.ai/keys)

## Setup

```bash
cd kids-story
npm install
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY
```

## Build

The project is written in TypeScript (`src/`) and compiles to `dist/`.

```bash
npm run build       # compile src/ -> dist/
npm run typecheck   # type-check only, no output
```

## Run

Run the compiled build:

```bash
npm run build
npm start -- "a friendly dragon"
```

Or run the TypeScript directly, with no build step (handy during development):

```bash
npm run dev -- "a friendly dragon"
# `npm run agent -- "..."` does the same
```

Optional system prompt override for one run:

```bash
npm run dev -- --system "You are a silly pirate storyteller for toddlers." "treasure hunt"
```

Or set `SYSTEM_PROMPT` in `.env` for all runs.

## Environment

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | Required — from [OpenRouter keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | `openai/gpt-5.5` (default) or `openai/gpt-5.4` |
| `SYSTEM_PROMPT` | Optional default system instructions |

Story subject is limited to **80 characters**.

## How it works

This is the simplest form of agent: **a prompt and a model, with no tools**. `tools: []` means the agent makes one model call and returns.

### Story agent

```mermaid
flowchart LR
    CLI["CLI arguments"] --> Validate["parseArgs and<br/>validateSubject"]
    Validate --> Agent["createAgent<br/>tools: none"]
    System["System prompt<br/>rules and tone"] --> Agent
    User["User prompt<br/>the subject"] --> Agent
    Agent <--> LLM["OpenRouter<br/>chat model"]
    Agent --> Extract["getStoryText<br/>last assistant message"]
    Extract --> Output["Story printed"]
```

| Concept | Where to look in `src/agent.ts` |
| --- | --- |
| System prompt: rules for every run | `DEFAULT_SYSTEM_PROMPT` |
| User prompt: this run's request | `userPrompt` in `main()` |
| Validation before spending tokens | `validateSubject()` |
| Reading the answer from the conversation | `getStoryText()` |
