import { describe, it, expect } from "vitest";
import { playAudioSfx } from "@/app/utils/audioSfx";

describe("audioSfx utility", () => {
  it("does not throw when audio is disabled", () => {
    expect(() => playAudioSfx("click", false)).not.toThrow();
    expect(() => playAudioSfx("boop", false)).not.toThrow();
    expect(() => playAudioSfx("success", false)).not.toThrow();
  });

  it("safely handles environments where AudioContext is undefined or mocked", () => {
    expect(() => playAudioSfx("click", true)).not.toThrow();
    expect(() => playAudioSfx("boop", true)).not.toThrow();
    expect(() => playAudioSfx("success", true)).not.toThrow();
  });
});
