const TAG_LABELS: Record<string, string> = {
  "year-round": "Year-round",
  "prepared-food": "Prepared food",
  "card-accepted": "Takes cards",
  atm: "ATM",
  "gluten-free": "Gluten-free",
  "black-owned": "Black-owned",
  jewelry: "Jewellery",
  "sri-lankan": "Sri Lankan",
  "west-african": "West African",
  "middle-eastern": "Middle Eastern",
};

export function tagLabel(tag: string) {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  return tag
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
