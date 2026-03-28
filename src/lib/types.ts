export interface RateLimitWindow {
  used_percentage: number;
  resets_at: number;
}

export interface UsageCurrent {
  rate_limits?: {
    five_hour?: RateLimitWindow;
    seven_day?: RateLimitWindow;
  };
  cost?: {
    total_cost_usd: number;
    total_duration_ms: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    used_percentage: number;
    remaining_percentage: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
  };
  model?: {
    id: string;
    display_name: string;
  };
  ts: number;
}

export interface UsageHistoryEntry {
  rate_limits?: {
    five_hour?: RateLimitWindow;
    seven_day?: RateLimitWindow;
  };
  cost?: {
    total_cost_usd: number;
    total_duration_ms: number;
  };
  ts: number;
}

export interface WindowUsage {
  windowStart: number;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
}
