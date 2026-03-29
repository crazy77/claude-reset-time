/** 토큰 수를 축약 문자열로 포맷 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

/** 사용률 퍼센트에 따른 프로그레스 바 색상 */
export function getBarColor(pct: number): string {
  if (pct < 40) return "bg-primary";
  if (pct < 70) return "bg-warning";
  return "bg-danger";
}

/** 사용률 퍼센트에 따른 텍스트 색상 */
export function getBarColorText(pct: number): string {
  if (pct < 40) return "text-primary-light";
  if (pct < 70) return "text-warning";
  return "text-danger";
}
