import type { AIProvider } from "../../shared/config";
import { proxyFetch, proxyFetchStream } from "../../shared/utils/proxy";
import { fetchGoogleAIModels } from "../../shared/utils/googleAI";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamResponse {
  ok: boolean;
  error?: string;
  chunks?: Array<{
    choices?: Array<{
      delta?: {
        content?: string;
      };
    }>;
  }>;
}

export interface AIModel {
  id: string;
  name?: string;
}

interface ModelsResponse {
  data?: any[];
  models?: any[];
}

async function* streamCompletion(
  provider: AIProvider,
  messages: Message[]
): AsyncGenerator<string, void, unknown> {
  const { apiKey, selectedModel } = await chrome.storage.sync.get([
    "apiKey",
    "selectedModel",
  ]);

  if (!apiKey && !provider.isLocal) {
    throw new Error(
      "API key not found. Please set your API key in the extension settings."
    );
  }

  const requestBody = {
    model: selectedModel || provider.model,
    messages,
    stream: true,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Only add Authorization header if API key is provided
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const baseUrl = provider.isLocal
    ? provider.customBaseUrl || provider.defaultBaseUrl || provider.baseUrl
    : provider.baseUrl;

  try {
    for await (const chunk of proxyFetchStream(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })) {
      yield chunk;
    }
  } catch (error) {
    console.error("Error in streamCompletion:", error);
    throw error;
  }
}

export async function* generateSummary(
  transcript: string,
  provider: AIProvider
): AsyncGenerator<string, void, unknown> {
  const prompt = `Provide a concise summary of this YouTube video transcript using markdown formatting:

${transcript}

Required format:
# TLDR
[2-3 sentence overview]

# Key Points
[Main content summary formatted as markdown]

Formatting rules:
- Use bullet points for key points
- Use **bold** for important terms
- Use *italic* for emphasis
- Use > for notable quotes
- Use --- for section breaks
- Use \`code\` for technical terms
- Use [text](link) for any references

Be direct and concise. Do not use introductory phrases like "Here's a summary" or "Let me summarize".`;

  try {
    for await (const token of streamCompletion(provider, [
      { role: "user", content: prompt },
    ])) {
      yield token;
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
}

export async function* askQuestion(
  question: string,
  summary: string,
  provider: AIProvider,
  chatHistory: Message[] = []
): AsyncGenerator<string, void, unknown> {
  const systemMessage: Message = {
    role: "system",
    content: `You are a friendly and helpful AI assistant discussing a YouTube video. Here is the video's summary for context:

${summary}

If the user asks something that isn't covered in the summary, you can say so while still trying to be helpful based on the context you have. Be direct and concise in your responses.`,
  };

  const userMessage: Message = { role: "user", content: question };
  const messages = [systemMessage, ...chatHistory, userMessage];

  try {
    for await (const token of streamCompletion(provider, messages)) {
      yield token;
    }
  } catch (error) {
    console.error("Error answering question:", error);
    throw error;
  }
}

export async function fetchModels(
  provider: AIProvider,
  apiKey: string | null,
  customBaseUrl?: string
): Promise<AIModel[]> {
  if (!provider.supportsModelList) {
    return [];
  }

  if (provider.name === "Google AI") {
    return fetchGoogleAIModels(apiKey || "");
  }

  const baseUrl = provider.isLocal
    ? customBaseUrl || provider.defaultBaseUrl || provider.baseUrl
    : provider.baseUrl;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Only add Authorization header if API key is provided
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  try {
    const response = (await proxyFetch(`${baseUrl}/models`, {
      headers,
    })) as ModelsResponse;
    const models = response.data || response.models || [];
    return models.map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
    }));
  } catch (error) {
    console.error("Error fetching models:", error);
    throw error;
  }
}
