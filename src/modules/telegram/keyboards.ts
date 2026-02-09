import { InlineKeyboard } from "grammy";

/**
 * Inline keyboard for trading pair selection
 */
export const tradingPairKeyboard = InlineKeyboard.from([
  [
    { text: "₿ BTC/USDT", callback_data: "pair:BTCUSDT" },
    { text: "Ξ ETH/USDT", callback_data: "pair:ETHUSDT" },
  ],
  [
    { text: "◎ SOL/USDT", callback_data: "pair:SOLUSDT" },
    { text: "🪙 BNB/USDT", callback_data: "pair:BNBUSDT" },
  ],
  [
    { text: "XRP/USDT", callback_data: "pair:XRPUSDT" },
    { text: "ADA/USDT", callback_data: "pair:ADAUSDT" },
  ],
  [{ text: "Other", callback_data: "pair:custom" }],
]);

/**
 * Inline keyboard for holding strategy selection
 */
export const holdingStrategyKeyboard = InlineKeyboard.from([
  [
    { text: "⚡ Scalp (5m-1h)", callback_data: "holding:scalp" },
    { text: "📊 Daily", callback_data: "holding:daily" },
  ],
  [
    { text: "📈 Swing", callback_data: "holding:swing" },
    { text: "🤖 Auto", callback_data: "holding:auto" },
  ],
]);

/**
 * Inline keyboard for risk profile selection
 */
export const riskProfileKeyboard = InlineKeyboard.from([
  [
    { text: "🛡️ Safe (Wide SL)", callback_data: "risk:safe" },
    { text: "📊 Growth (Balanced)", callback_data: "risk:growth" },
  ],
  [{ text: "🔥 Aggressive (Tight SL)", callback_data: "risk:aggressive" }],
]);

/**
 * Main menu keyboard - entry point after /start
 */
export const mainMenuKeyboard = InlineKeyboard.from([
  [{ text: "🤖 Get AI Signal", callback_data: "menu:signal" }],
  [{ text: "📊 Upload Chart First", callback_data: "menu:chart" }],
  [
    { text: "📈 Profit Simulator", callback_data: "menu:profit" },
    { text: "🔓 Unlock Access", callback_data: "menu:unlock" },
  ],
  [
    { text: "💰 Affiliate Program", callback_data: "menu:affiliate" },
    { text: "💬 Testimonials", callback_data: "menu:testimonials" },
  ],
  [
    { text: "📞 Customer Service", callback_data: "menu:cs" },
    { text: "❓ Help", callback_data: "menu:help" },
  ],
]);

/**
 * Master selection keyboard - choose trading strategy master
 */
export const masterSelectionKeyboard = InlineKeyboard.from([
  [
    { text: "🪙 CRYPTO MASTER", callback_data: "master:crypto" },
    { text: "💱 FOREX MASTER", callback_data: "master:forex" },
  ],
  [
    { text: "🥇 GOLD MASTER", callback_data: "master:gold" },
    { text: "📊 STOCK MASTER", callback_data: "master:stock" },
  ],
  [{ text: "⬅️ Back to Main Menu", callback_data: "nav:back" }],
]);

/**
 * Chart upload prompt keyboard - after ticker input
 */
export const chartUploadPromptKeyboard = InlineKeyboard.from([
  [
    { text: "📸 Upload Chart Now", callback_data: "chart:upload" },
    { text: "⏭️ Skip Chart Analysis", callback_data: "chart:skip" },
  ],
  [
    { text: "🔄 Change Ticker", callback_data: "chart:change_ticker" },
    { text: "🔀 Change Master", callback_data: "nav:back" },
  ],
]);

/**
 * Confirmation keyboard - before signal generation
 */
export const confirmationKeyboard = InlineKeyboard.from([
  [
    { text: "✅ Confirm & Generate", callback_data: "confirm:yes" },
    { text: "✏️ Edit Selections", callback_data: "confirm:edit" },
  ],
  [{ text: "❌ Cancel", callback_data: "confirm:cancel" }],
]);

/**
 * Quick actions keyboard - legacy for quick access
 */
export const quickActionsKeyboard = InlineKeyboard.from([
  [
    { text: "📈 Get Signal", callback_data: "action:signal" },
    { text: "📸 Upload Chart", callback_data: "action:chart" },
  ],
  [
    { text: "❓ Help", callback_data: "action:help" },
    { text: "⚙️ Settings", callback_data: "action:settings" },
  ],
]);

/**
 * Result actions keyboard - after signal generation
 */
export const resultActionsKeyboard = InlineKeyboard.from([
  [
    { text: "🔄 Get Another Signal", callback_data: "result:new" },
    { text: "🔀 Change Master", callback_data: "result:change_master" },
  ],
  [
    { text: "📊 View Details", callback_data: "result:details" },
    { text: "🏠 Main Menu", callback_data: "result:menu" },
  ],
]);

/**
 * Navigation keyboard - generic back/home options
 */
export const navigationKeyboard = InlineKeyboard.from([
  [
    { text: "⬅️ Back", callback_data: "nav:back" },
    { text: "🏠 Main Menu", callback_data: "nav:menu" },
  ],
  [{ text: "❌ Cancel", callback_data: "nav:cancel" }],
]);

/**
 * Add back button to pair selection keyboard
 */
export const tradingPairKeyboardWithBack = tradingPairKeyboard.append(
  InlineKeyboard.from([[{ text: "⬅️ Back", callback_data: "nav:back" }]])
);

/**
 * Add back button to holding strategy keyboard
 */
export const holdingStrategyKeyboardWithBack = holdingStrategyKeyboard.append(
  InlineKeyboard.from([[{ text: "⬅️ Back", callback_data: "nav:back" }]])
);

/**
 * Add back button to risk profile keyboard
 */
export const riskProfileKeyboardWithBack = riskProfileKeyboard.append(
  InlineKeyboard.from([[{ text: "⬅️ Back", callback_data: "nav:back" }]])
);
