export interface RateLimitWindow {
  used_percentage: number;
  resets_at: number;
  estimated?: boolean;  // true = statusline 아닌 JSONL 역산값
  synced?: boolean;     // true = claude.ai 스크래핑 데이터
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
  cacheTokens: number;
  outputTokens: number;
  messageCount: number;
}
