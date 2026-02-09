import { SignalResponse } from "../types";

/**
 * Get current date and time in UTC+7
 */
function getCurrentDateTimeUTC7(): { date: string; time: string } {
  const now = new Date();
  // Convert to UTC+7 (Bangkok time)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("id-ID", options);
  const parts = formatter.formatToParts(now);

  const dateStr = parts
    .filter((p) => ["day", "month", "year"].includes(p.type))
    .map((p) => p.value)
    .join(" ");

  const timeStr = parts
    .filter((p) => ["hour", "minute"].includes(p.type))
    .map((p) => p.value)
    .join(":");

  return { date: dateStr, time: timeStr };
}

/**
 * Get master emoji
 */
function getMasterEmoji(master?: string): string {
  switch (master) {
    case "crypto":
      return "🪙";
    case "forex":
      return "💱";
    case "gold":
      return "🥇";
    case "stock":
      return "📊";
    default:
      return "🔥";
  }
}

/**
 * Get master name for display
 */
function getMasterName(master?: string): string {
  switch (master) {
    case "crypto":
      return "CRYPTO MASTER";
    case "forex":
      return "FOREX MASTER";
    case "gold":
      return "GOLD MASTER";
    case "stock":
      return "STOCK MASTER";
    default:
      return "AI MASTER";
  }
}

/**
 * Format trade setup for Telegram display
 */
export function formatTradeSetup(result: SignalResponse, master?: string): string {
  if (!result.setup || result.setup.side === "no_trade") {
    return `❌ *No Trade Setup*\n\nReason: ${result.setup?.reason || "Conditions not met"}`;
  }

  const { date, time } = getCurrentDateTimeUTC7();
  const emoji = result.setup.side === "long" ? "📈" : "📉";
  const side = result.setup.side.toUpperCase();
  const pair = result.pair;
  const masterEmoji = getMasterEmoji(master);
  const masterName = getMasterName(master);

  let message = `${emoji} *${masterEmoji} ${masterName} : ${pair} - ${side}*\n`;
  message += `🕒 ${date}, ${time} (UTC+7)\n\n`;

  message += `💰 Current Price: $${result.setup.entry.toFixed(2)}\n`;
  message += `📍 Entry: $${result.setup.entry.toFixed(2)}\n`;
  message += `😵 Stop Loss: $${result.setup.stopLoss.toFixed(2)}\n\n`;

  message += `🎯 Take Profits:\n`;
  message += `TP1: $${result.setup.takeProfits[0].toFixed(2)} (1.5R)\n`;
  message += `TP2: $${result.setup.takeProfits[1].toFixed(2)} (2.5R)\n`;
  message += `TP3: $${result.setup.takeProfits[2].toFixed(2)} (4R)\n\n`;

  message += `📊 Risk Reward: ${result.setup.riskReward.toFixed(2)}\n`;
  message += `✅ Confidence: ${(result.setup.confidence * 100).toFixed(0)}% ✅\n`;

  if (result.interpretation?.reasoning) {
    message += `\n🔎 Alasan / Analisa:\n${result.interpretation.reasoning}`;
  }

  message += `\n\n⚠️ Risk management wajib. Bukan jaminan profit.`;

  return message;
}

/**
 * Format confirmation message before signal generation
 */
export function formatConfirmation(params: {
  master?: string;
  pair: string;
  holding: string;
  risk: string;
  hasChart: boolean;
}): string {
  const masterName = getMasterName(params.master);

  const holdingMap: Record<string, string> = {
    scalp: "Scalp (5m-1h)",
    daily: "Daily",
    swing: "Swing",
    auto: "Auto",
  };
  const holdingDisplay = holdingMap[params.holding] || params.holding;

  const riskMap: Record<string, string> = {
    safe: "Safe (Wide SL)",
    growth: "Growth (Balanced)",
    aggressive: "Aggressive (Tight SL)",
  };
  const riskDisplay = riskMap[params.risk] || params.risk;

  let message = `🔍 *Konfirmasi Signal Request*\n\n`;
  message += `📊 Master: ${masterName}\n`;
  message += `💱 Pair: ${params.pair}\n`;
  message += `⏰ Holding: ${holdingDisplay}\n`;
  message += `⚠️ Risk: ${riskDisplay}\n`;
  message += `📈 Chart Analysis: ${params.hasChart ? "✅ Yes" : "❌ No"}\n\n`;
  message += `Lanjutkan generate signal?`;

  return message;
}

/**
 * Format signal status for display
 */
export function formatSignalStatus(result: SignalResponse, master?: string): string {
  if (result.status === "processing") {
    return `⏳ *Processing Signal*\n\n*Pair:* \`${result.pair}\`\nPlease wait...`;
  }

  if (result.status === "failed") {
    return `❌ *Signal Processing Failed*\n\nError: ${result.error || "Unknown error"}`;
  }

  if (result.status === "pending") {
    return `⏳ *Queued for Processing*\n\n*Pair:* \`${result.pair}\`\nYour request is in the queue...`;
  }

  // Completed
  return formatTradeSetup(result, master);
}

/**
 * Format interpretation for display
 */
export function formatInterpretation(result: SignalResponse): string {
  if (!result.interpretation) {
    return "No market interpretation available";
  }

  const { bias, structure, confidence, key_levels, liquidity, volatility } =
    result.interpretation;

  let message = `*Market Interpretation*\n\n`;
  message += `*Bias:* ${bias.toUpperCase()}\n`;
  message += `*Structure:* ${structure}\n`;
  message += `*Volatility:* ${volatility}\n`;
  message += `*Liquidity:* ${liquidity}\n`;
  message += `*Confidence:* ${(confidence * 100).toFixed(0)}%\n`;

  if (key_levels && key_levels.length > 0) {
    message += `\n*Key Levels:*\n`;
    key_levels.forEach((level, i) => {
      message += `${i + 1}. $${level.toFixed(2)}\n`;
    });
  }

  return message;
}

/**
 * Format error message for user
 */
export function formatError(error: Error | string): string {
  const message = error instanceof Error ? error.message : String(error);

  // Don't expose internal errors to user
  if (message.includes("database") || message.includes("connection")) {
    return "❌ Service temporarily unavailable. Please try again later.";
  }

  if (message.includes("timeout")) {
    return "⏱️ Request timeout. Please try again.";
  }

  if (message.includes("validation") || message.includes("invalid")) {
    return `❌ Invalid parameters. Please check your input.`;
  }

  return `❌ Error: ${message}`;
}

/**
 * Format processing message
 */
export function formatProcessing(pair: string, master?: string): string {
  const masterName = getMasterName(master);
  return `🔍 *${masterName} sedang menganalisis ${pair}...*\n\n⏳ Fetching market data...\n⏳ Analyzing structure...\n⏳ Calculating risk levels...\n\nMohon tunggu sebentar (estimasi 30-60 detik)`;
}
