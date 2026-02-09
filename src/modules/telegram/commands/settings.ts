import { Context } from "../types";
import { navigationKeyboard } from "../keyboards";
import { createLogger } from "@/utils/logger";

const log = createLogger("SettingsCommand");

export async function handleSettingsCommand(ctx: Context) {
  try {
    const userId = ctx.from?.id;
    log.info({ userId }, "Settings command requested");

    const message = `⚙️ *Pengaturan Bot*

Coming Soon! 🚀

*Fitur yang akan datang:*
✅ Default master selection
✅ Default risk profile
✅ Notification preferences
✅ Saved pairs/favorites
✅ Trading history
✅ Performance analytics

Fitur ini sedang kami kembangkan untuk memberikan pengalaman terbaik.

Untuk sekarang, ketik /start untuk kembali ke menu utama.`;

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: navigationKeyboard,
    });
  } catch (error) {
    log.error({ error }, "Settings command failed");
    await ctx.reply("❌ Failed to load settings");
  }
}
