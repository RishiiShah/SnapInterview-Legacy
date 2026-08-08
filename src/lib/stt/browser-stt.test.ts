import { describe, expect, it } from "vitest";
import {
  isLocalSttEnabled,
  hasWebSpeechSupport,
  selectSttEngine,
} from "./browser-stt";

describe("isLocalSttEnabled", () => {
  it("defaults to enabled when the flag is unset", () => {
    expect(isLocalSttEnabled(undefined)).toBe(true);
  });

  it("is disabled only for the explicit string 'false'", () => {
    expect(isLocalSttEnabled("false")).toBe(false);
    expect(isLocalSttEnabled("true")).toBe(true);
    expect(isLocalSttEnabled("")).toBe(true);
  });
});

describe("hasWebSpeechSupport", () => {
  it("detects the standard constructor", () => {
    expect(hasWebSpeechSupport({ SpeechRecognition: class {} })).toBe(true);
  });

  it("detects the webkit-prefixed constructor", () => {
    expect(hasWebSpeechSupport({ webkitSpeechRecognition: class {} })).toBe(true);
  });

  it("is false when neither constructor exists (e.g. Firefox)", () => {
    expect(hasWebSpeechSupport({})).toBe(false);
  });
});

describe("selectSttEngine", () => {
  it("prefers Web Speech when available (Chrome/Safari/Edge)", () => {
    expect(selectSttEngine({ hasWebSpeech: true, localEnabled: true })).toBe("web-speech");
    expect(selectSttEngine({ hasWebSpeech: true, localEnabled: false })).toBe("web-speech");
  });

  it("falls back to the local model when Web Speech is missing (Firefox)", () => {
    expect(selectSttEngine({ hasWebSpeech: false, localEnabled: true })).toBe("local");
  });

  it("reports none when Web Speech is missing and local is disabled", () => {
    expect(selectSttEngine({ hasWebSpeech: false, localEnabled: false })).toBe("none");
  });
});
