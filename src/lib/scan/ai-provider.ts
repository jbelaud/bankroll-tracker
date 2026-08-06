import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { buildExtractionPrompt } from "@/lib/scan/extraction-prompt";

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite"] as const;
type GeminiModel = (typeof GEMINI_MODELS)[number];

const BETS_RESPONSE_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: { type: "string" },
      ticketRef: { type: ["string", "null"] },
      sport: { type: "string" },
      betType: { type: "string" },
      description: { type: "string" },
      eventResult: { type: ["string", "null"] },
      stake: { type: "number" },
      odds: { type: "number" },
      boosted: { type: "boolean" },
      originalOdds: { type: ["number", "null"] },
      freebet: { type: "boolean" },
      live: { type: "boolean" },
      result: { type: "string", enum: ["Gagné", "Perdu", "Remboursé", "En attente", "Cashé"] },
      cashOutAmount: { type: ["number", "null"] },
    },
    required: [
      "date",
      "ticketRef",
      "sport",
      "betType",
      "description",
      "eventResult",
      "stake",
      "odds",
      "boosted",
      "originalOdds",
      "freebet",
      "live",
      "result",
      "cashOutAmount",
    ],
  },
} as const;

export type ScanMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export type ScanAiResponse = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

function getGeminiModel(): GeminiModel {
  const configuredModel = process.env.GEMINI_MODEL;
  return GEMINI_MODELS.includes(configuredModel as GeminiModel)
    ? (configuredModel as GeminiModel)
    : "gemini-3.5-flash-lite";
}

export function hasConfiguredScanProvider(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export async function analyzeTicketImage({
  base64,
  mediaType,
}: {
  base64: string;
  mediaType: ScanMediaType;
}): Promise<ScanAiResponse> {
  const geminiApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    const model = getGeminiModel();
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          inlineData: { mimeType: mediaType, data: base64 },
        },
        { text: "Analyse cette capture de ticket de paris sportifs." },
      ],
      config: {
        systemInstruction: buildExtractionPrompt(),
        responseMimeType: "application/json",
        responseJsonSchema: BETS_RESPONSE_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    if (!response.text) throw new Error("Réponse Gemini vide");
    return {
      text: response.text,
      model,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Aucun fournisseur IA configuré");
  }

  const response = await new Anthropic().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: buildExtractionPrompt() },
        ],
      },
    ],
  });
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    text,
    model: "claude-haiku-4-5",
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** Generates structured text for other server-side AI features, such as insights. */
export async function generateTextWithConfiguredProvider(prompt: string): Promise<string> {
  const geminiApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    const response = await new GoogleGenAI({ apiKey: geminiApiKey }).models.generateContent({
      model: getGeminiModel(),
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });
    if (!response.text) throw new Error("R\u00e9ponse Gemini vide");
    return response.text;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Aucun fournisseur IA configur\u00e9");
  }

  const response = await new Anthropic().messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}
