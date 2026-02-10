import { createLogger } from "@/utils/logger";
import { SignalParams, SignalResponse } from "./types";

const log = createLogger("TelegramAPIClient");

export class TradingAPIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Create a signal request via the API
   */
  async createSignal(
    userId: string,
    params: SignalParams
  ): Promise<{ jobId: string }> {
    try {
      log.info({ baseURL: this.baseURL, pair: params.pair }, "Creating signal request");

      const response = await fetch(`${this.baseURL}/signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          pair: params.pair,
          holding: params.holding,
          risk: params.risk,
          image_base64: params.imageBase64,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unable to read error");
        log.error(
          {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
            url: `${this.baseURL}/signal`
          },
          "API returned error"
        );
        throw new Error(
          `API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as { jobId: string };
      log.debug({ jobId: data.jobId, pair: params.pair }, "Signal created");
      return data;
    } catch (error) {
      log.error({
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        params
      }, "Failed to create signal");
      throw error;
    }
  }

  /**
   * Get signal status and result
   */
  async getSignalStatus(userId: string, jobId: string): Promise<SignalResponse> {
    try {
      const response = await fetch(`${this.baseURL}/signal/${jobId}`, {
        headers: { "x-user-id": userId },
      });

      if (!response.ok) {
        throw new Error(
          `API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as SignalResponse;
      log.debug({ jobId, status: data.status }, "Retrieved signal status");
      return data;
    } catch (error) {
      log.error({ error, jobId }, "Failed to get signal status");
      throw error;
    }
  }

  /**
   * Poll signal until completion with retry logic
   */
  async pollSignalUntilComplete(
    userId: string,
    jobId: string,
    maxAttempts: number = 30,
    interval: number = 5000
  ): Promise<SignalResponse> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const result = await this.getSignalStatus(userId, jobId);

        if (result.status === "completed" || result.status === "failed") {
          return result;
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      } catch (error) {
        log.warn({ jobId, attempts }, "Poll attempt failed");
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      }
    }

    throw new Error(`Signal processing timeout after ${maxAttempts} attempts`);
  }

  /**
   * Check if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      log.warn({ error }, "Health check failed");
      return false;
    }
  }
}
