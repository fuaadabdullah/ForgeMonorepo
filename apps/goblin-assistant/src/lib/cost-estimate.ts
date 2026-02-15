export interface TextCostEstimate {
  estimated_tokens: number;
  estimated_cost_usd: number;
}

// Conservative default for "quick estimate" in the UI.
// Interpreted as USD per 1k tokens.
const DEFAULT_USD_PER_1K_TOKENS = 0.02;

export function estimateFromText(text: string): TextCostEstimate {
  const cleaned = (text || '').trim();
  if (!cleaned) {
    return { estimated_tokens: 0, estimated_cost_usd: 0 };
  }

  // Heuristic: ~4 chars per token (roughly English/ASCII average).
  const estimatedTokens = Math.max(8, Math.round(cleaned.length / 4));
  const estimatedCostUsd = (estimatedTokens / 1000) * DEFAULT_USD_PER_1K_TOKENS;

  return {
    estimated_tokens: estimatedTokens,
    estimated_cost_usd: Number(estimatedCostUsd.toFixed(6)),
  };
}

