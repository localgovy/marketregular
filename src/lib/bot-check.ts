import { checkBotId } from "botid/server";
import { headers } from "next/headers";

/**
 * True only when BotID classifies the caller as a bot.
 * A thrown check, a missing header, or a local dev bypass lets the action continue.
 * Password sign-in uses this so a BotID outage does not lock existing accounts.
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

/**
 * True when BotID accepts the caller. A missing header, a thrown check, or a bot is rejected.
 * Development bypass still passes.
 */
export async function isHumanRequest() {
  try {
    if (process.env.NODE_ENV === "production") {
      const presented = (await headers()).get("x-is-human");
      if (!presented) return false;
    }
    const result = await checkBotId();
    if (result.bypassed || result.isVerifiedBot) return true;
    return result.isHuman === true && result.isBot !== true;
  } catch {
    return false;
  }
}
