import { Groq } from "groq-sdk";
import { requireGroqApiKey } from "@/lib/env";

export const groqClient = new Groq({ apiKey: requireGroqApiKey() });
