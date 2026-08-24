export const CLAIM_ROLES = {
  market: [
    "I organize this market",
    "I work for the market",
    "City, BIA, or landlord",
    "Something else",
  ],
  vendor: [
    "I run this stall",
    "I grow or make what we sell",
    "I work the stall",
    "Something else",
  ],
} as const;

export type ClaimListingType = keyof typeof CLAIM_ROLES;
