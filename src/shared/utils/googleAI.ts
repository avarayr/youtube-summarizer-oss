import type { AIModel } from "../../content/utils/ai";

const GOOGLE_AI_MODELS: AIModel[] = [
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Experimental)" },
  { id: "gemini-exp-1206", name: "Gemini Experimental 1206" },
  {
    id: "gemini-2.0-flash-thinking-exp-1219",
    name: "Gemini 2.0 Flash Thinking (Experimental)",
  },
  { id: "gemma-2-2b-it", name: "Gemma 2B IT" },
  { id: "gemma-2-9b-it", name: "Gemma 9B IT" },
  { id: "gemma-2-27b-it", name: "Gemma 27B IT" },
];

export async function fetchGoogleAIModels(_apiKey: string): Promise<AIModel[]> {
  // Return the hardcoded list directly
  return GOOGLE_AI_MODELS;
}
