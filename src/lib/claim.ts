export const CLAIM_ROLES = {
  market: [
    "I organize this market",
    "I work for the market",
    "City, BIA, or landlord",
    "Something else",
  ],
  vendor: [
    "I run this vendor listing",
    "I grow or make what we sell",
    "I work for this vendor",
    "Something else",
  ],
} as const;

export type ClaimListingType = keyof typeof CLAIM_ROLES;
export type ClaimRole = (typeof CLAIM_ROLES)[ClaimListingType][number];

export function isClaimRole(targetType: ClaimListingType, role: string): role is ClaimRole {
  return (CLAIM_ROLES[targetType] as readonly string[]).includes(role);
}
