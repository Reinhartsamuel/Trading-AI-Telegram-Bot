import { Context } from "../types";
import {
  holdingStrategyKeyboard,
  riskProfileKeyboard,
  holdingStrategyKeyboardWithBack,
  navigationKeyboard,
} from "../keyboards";
import { createLogger } from "@/utils/logger";

const log = createLogger("PhotoHandler");

/**
 * Download file from Telegram and convert to base64
 */
async function downloadFileAsBase64(
  fileUrl: string
): Promise<string> {
  try {
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (error) {
    log.error({ error }, "Failed to download file");
    throw error;
  }
}

export async function handlePhotoCommand(ctx: Context) {
  try {
    const userId = String(ctx.from?.id || "anonymous");
    const flowStep = ctx.session.flowStep;

    // Check if we're expecting a chart
    if (flowStep !== "chart_upload_prompt" && !ctx.session.waitingForChart) {
      await ctx.reply(
        "❌ Please use the button-based flow to upload charts.\n\nKetik /start untuk mulai.",
        {
          parse_mode: "Markdown",
          reply_markup: navigationKeyboard,
        }
      );
      return;
    }

    // Get the largest photo (best quality)
    const photo = ctx.message?.photo?.[ctx.message.photo!.length - 1];

    if (!photo) {
      await ctx.reply("❌ No photo found in message");
      return;
    }

    // Send processing message
    const processingMsg = await ctx.reply(
      `📊 Menganalisis chart untuk ${ctx.session.lastPair}...\n\n⏳ Extracting support/resistance levels...\n⏳ Identifying patterns...\n\nMohon tunggu ⏳`
    );

    try {
      // Get file info
      const file = await ctx.api.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

      // Download and convert to base64
      const imageBase64 = await downloadFileAsBase64(fileUrl);

      // Store in session
      ctx.session.chartImage = imageBase64;
      ctx.session.flowStep = "holding_selection";
      ctx.session.waitingForChart = false;

      // Delete processing message
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      } catch (e) {
        // Ignore
      }

      // Confirmation
      await ctx.reply(
        `✅ Analisis chart selesai!\n\nSekarang pilih holding strategy:`,
        {
          parse_mode: "Markdown",
          reply_markup: holdingStrategyKeyboardWithBack,
        }
      );

      log.info(
        { userId, fileSize: imageBase64.length, flowStep },
        "Chart image processed"
      );
    } catch (processError) {
      // Delete processing message
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, processingMsg.message_id);
      } catch (e) {
        // Ignore
      }

      // Offer to skip chart
      await ctx.reply(
        `❌ Gagal memproses chart untuk ${ctx.session.lastPair}.\n\n✅ Analisis chart tidak tersedia. Lanjut tanpa chart?`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Lanjut tanpa chart", callback_data: "chart:skip" },
                { text: "🔄 Ganti ticker", callback_data: "chart:change_ticker" },
              ],
            ],
          },
        }
      );

      log.error({ userId, error: processError }, "Photo processing failed");
    }
  } catch (error) {
    log.error({ error }, "Photo handler failed");
    await ctx.reply("❌ Failed to process photo");
  }
}
