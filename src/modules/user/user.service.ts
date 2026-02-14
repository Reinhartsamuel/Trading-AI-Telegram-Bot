import { getDatabase } from "@/db/postgres";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "@/utils/logger";

const log = createLogger("UserService");

export interface UserData {
  id: string;
  telegramId: string;
  email?: string;
}

/**
 * Get or create user by Telegram ID
 * This is called at the start of every conversation
 */
export async function getOrCreateUser(telegramId: string): Promise<UserData> {
  try {
    const db = getDatabase();

    log.debug({ telegramId }, "Checking if user exists");

    // Try to find existing user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
    });

    if (existingUser) {
      log.debug({ telegramId, userId: existingUser.id }, "Existing user found");
      return {
        id: existingUser.id,
        telegramId: existingUser.telegramId!,
        email: existingUser.email || undefined,
      };
    }

    // User doesn't exist, create new one
    log.info({ telegramId }, "Creating new user");

    const newUser = await db
      .insert(users)
      .values({
        id: `tg_${telegramId}`, // Use telegram ID as primary key
        telegramId,
      })
      .returning();

    log.info({ telegramId, userId: newUser[0].id }, "New user created");

    return {
      id: newUser[0].id,
      telegramId: newUser[0].telegramId!,
      email: newUser[0].email || undefined,
    };
  } catch (error) {
    log.error({ telegramId, error }, "Failed to get or create user");
    throw error;
  }
}

/**
 * Get user by Telegram ID
 */
export async function getUserByTelegramId(
  telegramId: string
): Promise<UserData | null> {
  try {
    const db = getDatabase();

    const user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      telegramId: user.telegramId!,
      email: user.email || undefined,
    };
  } catch (error) {
    log.error({ telegramId, error }, "Failed to get user");
    throw error;
  }
}

/**
 * Update user email
 */
export async function updateUserEmail(
  telegramId: string,
  email: string
): Promise<void> {
  try {
    const db = getDatabase();

    await db
      .update(users)
      .set({ email })
      .where(eq(users.telegramId, telegramId));

    log.info({ telegramId, email }, "User email updated");
  } catch (error) {
    log.error({ telegramId, email, error }, "Failed to update user email");
    throw error;
  }
}
