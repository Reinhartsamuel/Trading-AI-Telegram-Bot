import { Context } from "../types";
import { createLogger } from "@/utils/logger";

const log = createLogger("HelpCommand");

export async function handleHelpCommand(ctx: Context) {
  try {
    const helpMessage = `
*🤖 Trading Signal Bot - Help*

*📌 Main Commands:*

\`/signal PAIR HOLDING RISK\`
Generate a trading signal for a cryptocurrency pair

*Parameters:*
• PAIR: Crypto pair (BTCUSDT, ETHUSDT, etc)
• HOLDING: scalp | daily | swing | auto
• RISK: safe | growth | aggressive

*Example:*
\`/signal BTCUSDT scalp growth\`

---

\`/status <jobId>\`
Check the status of a signal request
Without jobId, uses the last signal you created

*Example:*
\`/status 550e8400-e29b-41d4\`

---

*📸 Upload Chart*
Simply send a chart image to analyze it
You'll be prompted to select trading parameters

---

*⚙️ Understanding Parameters:*

*Holding Strategies:*
🐇 *scalp* - Very short term (5m-1h)
📊 *daily* - Daily timeframe
📈 *swing* - Multi-day trades
🤖 *auto* - Automatic (system decides)

*Risk Profiles:*
🛡️ *safe* - Wide stops (2.5 ATR), high confidence required
📊 *growth* - Balanced (1.8 ATR), moderate confidence
🔥 *aggressive* - Tight stops (1.2 ATR), lower confidence

---

*💡 Signal Details:*
Each signal includes:
• Entry price
• Stop Loss level
• Take Profit targets (1.5R, 2.5R, 4R)
• Risk/Reward ratio
• Confidence level
• Market analysis

---

*❓ FAQ:*

*Q: How long does analysis take?*
A: Typically 30 seconds to 2 minutes depending on processing

*Q: Can I upload a chart?*
A: Yes! Charts are analyzed with AI vision for technical patterns

*Q: What's RR (Risk/Reward)?*
A: Ratio of potential profit to potential loss. Higher is better.

*Q: Are signals guaranteed?*
A: No. Trading is risky. Use signals as guidance only.

---

Need more help? Contact support or check the documentation.
    `;

    await ctx.reply(helpMessage, { parse_mode: "Markdown" });
    log.info({ userId: ctx.from?.id }, "Help requested");
  } catch (error) {
    log.error({ error }, "Help command failed");
    await ctx.reply("❌ Failed to show help");
  }
}
