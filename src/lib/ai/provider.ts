// AI provider interface. Today: mock provider. Tomorrow: swap in OpenAI by
// setting AI_PROVIDER=openai and OPENAI_API_KEY. No UI changes required.

import type { ReportPayload, VehicleInput } from "@/lib/types/report";
import { generateMockReport } from "./mock-provider";
import { generateOpenAIReport } from "./openai-provider";

export interface AIProvider {
  readonly id: string;
  readonly displayName: string;
  generateReport(input: VehicleInput): Promise<ReportPayload>;
}

export type ProviderId = "mock" | "openai";

function pickProvider(): AIProvider {
  const id = (process.env.AI_PROVIDER ?? "mock") as ProviderId;
  if (id === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      console.warn(
        "[ai] AI_PROVIDER=openai but OPENAI_API_KEY is missing — falling back to mock.",
      );
      return mockProvider;
    }
    return openaiProvider;
  }
  return mockProvider;
}

export const mockProvider: AIProvider = {
  id: "mock",
  displayName: "Heuristic Engine (Offline Mock)",
  async generateReport(input) {
    return generateMockReport(input);
  },
};

export const openaiProvider: AIProvider = {
  id: "openai",
  displayName: "OpenAI GPT",
  async generateReport(input) {
    return generateOpenAIReport(input);
  },
};

export const ai: AIProvider = pickProvider();

export { generateMockReport, generateOpenAIReport };
