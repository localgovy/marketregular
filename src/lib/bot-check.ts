import { checkBotId } from "botid/server";

/**
 * True only when BotID classifies the caller as a bot.
 * A thrown check, a missing header, or a local dev bypass lets the action continue.
 */
export async function isBlockedBot() {
  try {
    const result = await checkBotId();
    if (result.bypassed || result.isVerifiedBot) return false;
    return result.isBot === true;
  } catch {
    return false;
  }
}
