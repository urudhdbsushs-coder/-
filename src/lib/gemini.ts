import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging tailwind classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
}

export const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

export const MODELS = {
  CHAT: "gemini-3.1-pro-preview",
  LIGHT_CHAT: "gemini-3-flash-preview",
  IMAGE: "gemini-2.5-flash-image",
  TTS: "gemini-3.1-flash-tts-preview",
};

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function* streamChat(messages: ChatMessage[]) {
  const chat = ai.chats.create({
    model: MODELS.CHAT,
    config: {
      systemInstruction: "You are Aether AI, a sophisticated, helpful, and highly intelligent multi-modal assistant. You are refined, clear, and capable of complex reasoning.",
    }
  });

  // The chat.sendMessageStream needs the previous history. 
  // For simplicity in a stream function, we can also use ai.models.generateContentStream 
  // with the full history since chat state in the SDK can be tricky with external history management.
  
  const response = await ai.models.generateContentStream({
    model: MODELS.CHAT,
    contents: messages,
    config: {
      systemInstruction: "You are Aether AI, a sophisticated assistant. Provide clear, concise, and accurate responses.",
    }
  });

  for await (const chunk of response) {
    if (chunk.text) {
      yield chunk.text;
    }
  }
}

export async function generateImage(prompt: string) {
  const response = await ai.models.generateContent({
    model: MODELS.IMAGE,
    contents: [{ parts: [{ text: prompt }] }],
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data returned from Gemini");
}

export async function textToSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: MODELS.TTS,
    contents: [{ parts: [{ text: `Say with a refined, clear voice: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Zephyr" },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");

  // Create absolute URL for audio playback
  const binary = atob(base64Audio);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}
