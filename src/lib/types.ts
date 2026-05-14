export type Exchange = "SH" | "SZ" | "BJ";

export type NormalizedSymbol = {
  raw: string;
  code: string;
  exchange: Exchange;
  eastmoneySecid: string;
  tushareCode: string;
  display: string;
};

export type StockSearchResult = {
  symbol: string;
  code: string;
  name: string;
  exchange: Exchange;
  market: string;
  price?: number | null;
  changePercent?: number | null;
};

export type StockQuote = {
  symbol: string;
  code: string;
  name: string;
  exchange: Exchange;
  market: string;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  amount: number | null;
  turnoverRate: number | null;
  pe: number | null;
  pb: number | null;
  marketCap: number | null;
  updatedAt: string;
};

export type KlineBar = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  turnoverRate?: number | null;
};

export type IndicatorSnapshot = {
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  ema12: number | null;
  ema26: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  rsi6: number | null;
  rsi14: number | null;
  kdjK: number | null;
  kdjD: number | null;
  kdjJ: number | null;
  bollUpper: number | null;
  bollMiddle: number | null;
  bollLower: number | null;
  atr14: number | null;
  volumeRatio20: number | null;
  high20: number | null;
  low20: number | null;
  high60: number | null;
  low60: number | null;
  drawdown60: number | null;
  volatility20: number | null;
  liquidityScore: number | null;
};

export type ScoreBreakdown = {
  trend: number;
  momentum: number;
  volume: number;
  risk: number;
  valuation: number;
  liquidity: number;
  total: number;
};

export type OperationSignal =
  | "BUY"
  | "ACCUMULATE"
  | "HOLD"
  | "WATCH"
  | "REDUCE"
  | "STOP_LOSS";

export type TradingPlan = {
  signal: OperationSignal;
  signalLabel: string;
  score: number;
  positionRange: [number, number];
  entryRange: [number, number];
  stopLoss: number;
  takeProfit: [number, number];
  invalidation: string;
  riskLevel: "低" | "中" | "高";
  horizon: "5-20日波段";
};

export type QuantAnalysis = {
  symbol: string;
  quote: StockQuote;
  history: KlineBar[];
  indicators: IndicatorSnapshot;
  scores: ScoreBreakdown;
  plan: TradingPlan;
  reasons: string[];
  warnings: string[];
  backtest: BacktestResult;
};

export type DeepSeekReport = {
  title: string;
  summary: string;
  action: string;
  confidence: number;
  bullets: string[];
  riskNotes: string[];
  executionChecklist: string[];
  disclaimer: string;
  model: string;
  generatedAt: string;
  fallback: boolean;
};

export type AnalysisReport = QuantAnalysis & {
  aiReport: DeepSeekReport;
};

export type BacktestTrade = {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPercent: number;
  holdingDays: number;
};

export type BacktestResult = {
  period: string;
  totalReturn: number;
  benchmarkReturn: number;
  maxDrawdown: number;
  winRate: number;
  tradeCount: number;
  averageHoldingDays: number;
  costAssumption: string;
  equityCurve: Array<{ date: string; equity: number; benchmark: number }>;
  trades: BacktestTrade[];
};

export type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  note: string | null;
  created_at: string;
};

export type StoredReport = {
  id: string;
  symbol: string;
  name: string | null;
  signal: string;
  score: number;
  payload: AnalysisReport;
  created_at: string;
};

export type SubscriptionPlan = "free" | "pro" | "premium" | "admin";

export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "expired";

export type UserSubscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  analysis_daily_limit: number;
  current_period_start: string;
  current_period_end: string | null;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type UsageCounter = {
  id: string;
  user_id: string;
  usage_date: string;
  event_type: string;
  count: number;
  created_at: string;
  updated_at: string;
};

export type MarketDataProvider = {
  search(query: string): Promise<StockSearchResult[]>;
  getQuote(symbol: string): Promise<StockQuote>;
  getHistory(symbol: string, days?: number): Promise<KlineBar[]>;
};
