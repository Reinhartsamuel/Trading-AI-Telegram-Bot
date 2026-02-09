import { Context as GrammyContext, SessionFlavor } from "grammy";

export interface TelegramSessionData {
  // Legacy fields
  lastJobId?: string;
  lastPair?: string;
  lastHolding?: string;
  lastRisk?: string;
  chartImage?: string;
  state?: "waiting_pair" | "waiting_holding" | "waiting_risk" | "idle";

  // New flow state machine
  flowStep?: "idle" | "master_selection" | "ticker_input" | "chart_upload_prompt" | "holding_selection" | "risk_selection" | "confirmation" | "processing" | "result";

  // Master type selection
  master?: "crypto" | "forex" | "gold" | "stock";

  // Waiting for user input flags
  waitingForTicker?: boolean;
  waitingForChart?: boolean;

  // Flow navigation history (for back button)
  flowHistory?: string[];

  // Processing metadata
  processingJobId?: string;
}

export type Context = GrammyContext & SessionFlavor<TelegramSessionData>;

export interface SignalParams {
  pair: string;
  holding: "scalp" | "daily" | "swing" | "auto";
  risk: "safe" | "growth" | "aggressive";
  imageBase64?: string;
}

export interface SignalResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  pair: string;
  holding: string;
  risk: string;
  setup?: TradeSetup;
  interpretation?: MarketInterpretation;
  error?: string;
}

export interface TradeSetup {
  side: "long" | "short" | "no_trade";
  entry: number;
  stopLoss: number;
  takeProfits: number[];
  riskReward: number;
  confidence: number;
  reason: string;
}

export interface MarketInterpretation {
  bias: "bullish" | "bearish" | "neutral";
  structure: "trend" | "range" | "breakout" | "reversal";
  key_levels: number[];
  liquidity: "above" | "below" | "both" | "none";
  volatility: "low" | "normal" | "high";
  confidence: number;
  reasoning: string;
}
