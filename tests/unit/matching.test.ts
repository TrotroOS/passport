import { describe, it, expect } from "vitest";
import {
  normalizeText,
  normalizeName,
  jaccardSimilarity,
  levenshteinRatio,
  namesMatch,
  descriptionsSimilar,
  percentDifference,
} from "@/lib/verification/matching";

describe("verification matching", () => {
  it("normalizes text", () => {
    expect(normalizeText("Hello, World!")).toBe("hello world");
  });

  it("computes jaccard similarity", () => {
    expect(jaccardSimilarity("widget pro", "widget pro 3000")).toBeGreaterThan(0.5);
  });

  it("computes levenshtein ratio", () => {
    expect(levenshteinRatio("Acme Corp", "Acme Corporation")).toBeGreaterThan(0.5);
  });

  it("matches names exactly after normalization", () => {
    expect(namesMatch("ACME Corp.", "acme corp")).toBe(true);
  });

  it("detects description similarity", () => {
    expect(descriptionsSimilar("electronic widget", "electronic widgets")).toBe(true);
  });

  it("computes percent difference", () => {
    expect(percentDifference(1000, 950)).toBeCloseTo(5, 0);
  });

  it("returns 0 percent difference for equal values", () => {
    expect(percentDifference(100, 100)).toBe(0);
  });
});

describe("normalizeName", () => {
  it("strips punctuation", () => {
    expect(normalizeName("O'Brien & Co.")).toBe("o brien co");
  });
});
