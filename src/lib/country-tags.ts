import { COUNTRY_TAGS } from "@/lib/constants";

export type CountryTag = (typeof COUNTRY_TAGS)[number];

const COUNTRY_SET = new Set<string>(COUNTRY_TAGS);

const ROLLUP: Partial<Record<CountryTag, CountryTag[]>> = {
  jamaican: ["caribbean"],
  trinidadian: ["caribbean"],
  haitian: ["caribbean"],
  lebanese: ["middle-eastern", "mediterranean"],
  persian: ["middle-eastern"],
  turkish: ["middle-eastern", "mediterranean"],
  syrian: ["middle-eastern"],
  afghan: ["middle-eastern"],
  egyptian: ["middle-eastern", "mediterranean"],
  moroccan: ["middle-eastern", "mediterranean"],
  greek: ["mediterranean"],
  spanish: ["mediterranean"],
  portuguese: ["mediterranean"],
  nigerian: ["west-african"],
  ghanaian: ["west-african"],
};

/** Word or phrase in a typed search → tag slug. */
const QUERY_ALIASES: Array<{ tag: CountryTag; needles: string[] }> = [
  { tag: "italian", needles: ["italian", "italy", "sicilian", "tuscan"] },
  { tag: "french", needles: ["french", "france"] },
  { tag: "portuguese", needles: ["portuguese", "portugal", "azorean", "azores"] },
  { tag: "spanish", needles: ["spanish", "spain", "paella", "catalan"] },
  { tag: "greek", needles: ["greek", "greece", "souvlaki", "crete"] },
  { tag: "german", needles: ["german", "germany", "bavarian", "pretzel"] },
  { tag: "polish", needles: ["polish", "poland", "pierogi", "perogy", "perogies"] },
  { tag: "ukrainian", needles: ["ukrainian", "ukraine"] },
  { tag: "hungarian", needles: ["hungarian", "hungary"] },
  { tag: "dutch", needles: ["dutch", "netherlands", "stroopwafel"] },
  { tag: "belgian", needles: ["belgian", "belgium"] },
  { tag: "british", needles: ["british", "england"] },
  { tag: "jamaican", needles: ["jamaican", "jamaica", "jerk", "jamrock"] },
  { tag: "trinidadian", needles: ["trinidadian", "trinidad", "doubles"] },
  { tag: "haitian", needles: ["haitian", "haiti"] },
  { tag: "caribbean", needles: ["caribbean", "west indian", "carribean"] },
  { tag: "mexican", needles: ["mexican", "mexico", "taco", "tacos", "tamale", "tamales"] },
  { tag: "colombian", needles: ["colombian", "colombia"] },
  { tag: "brazilian", needles: ["brazilian", "brazil"] },
  { tag: "argentinian", needles: ["argentinian", "argentine", "argentina", "gaucho"] },
  { tag: "peruvian", needles: ["peruvian", "peru"] },
  { tag: "venezuelan", needles: ["venezuelan", "venezuela", "arepa", "arepas"] },
  { tag: "guatemalan", needles: ["guatemalan", "guatemala"] },
  { tag: "bolivian", needles: ["bolivian", "bolivia"] },
  { tag: "salvadoran", needles: ["salvadoran", "salvadorian", "el salvador", "pupusa", "pupusas"] },
  { tag: "indian", needles: ["indian", "india", "masala", "samosa", "samosas", "naan", "tandoor"] },
  { tag: "pakistani", needles: ["pakistani", "pakistan", "paratha"] },
  { tag: "sri-lankan", needles: ["sri lankan", "sri lanka", "srilankan"] },
  { tag: "nepali", needles: ["nepali", "nepalese", "nepal", "momo", "momos"] },
  { tag: "tibetan", needles: ["tibetan", "tibet", "momo", "momos"] },
  { tag: "chinese", needles: ["chinese", "sichuan", "szechuan", "cantonese"] },
  { tag: "taiwanese", needles: ["taiwanese", "taiwan"] },
  { tag: "japanese", needles: ["japanese", "japan", "sushi", "ramen", "onigiri", "matcha"] },
  { tag: "korean", needles: ["korean", "korea", "kimchi", "bibimbap", "bulgogi"] },
  { tag: "vietnamese", needles: ["vietnamese", "vietnam", "pho", "banh mi"] },
  { tag: "thai", needles: ["thai", "thailand", "pad thai"] },
  { tag: "filipino", needles: ["filipino", "philippines"] },
  { tag: "malaysian", needles: ["malaysian", "malaysia"] },
  { tag: "cambodian", needles: ["cambodian", "cambodia"] },
  { tag: "lebanese", needles: ["lebanese", "lebanon"] },
  { tag: "persian", needles: ["persian", "iranian", "iran"] },
  { tag: "turkish", needles: ["turkish", "gozleme"] },
  { tag: "syrian", needles: ["syrian", "syria"] },
  { tag: "afghan", needles: ["afghan", "afghanistan"] },
  { tag: "ethiopian", needles: ["ethiopian", "ethiopia", "injera"] },
  { tag: "eritrean", needles: ["eritrean", "eritrea"] },
  { tag: "somali", needles: ["somali", "somalia"] },
  { tag: "nigerian", needles: ["nigerian", "nigeria", "jollof"] },
  { tag: "ghanaian", needles: ["ghanaian", "ghana"] },
  { tag: "west-african", needles: ["west african", "west africa"] },
  { tag: "moroccan", needles: ["moroccan", "morocco"] },
  { tag: "egyptian", needles: ["egyptian", "egypt"] },
  { tag: "middle-eastern", needles: ["middle eastern", "middle east", "levantine", "shawarma"] },
  { tag: "mediterranean", needles: ["mediterranean"] },
];

type Hint = { tag: CountryTag; patterns: RegExp[] };

function word(source: string) {
  return new RegExp(`(?:^|[^a-z])(?:${source})(?:[^a-z]|$)`);
}

const HINTS: Hint[] = [
  { tag: "sri-lankan", patterns: [word("sri ?lanka(?:n)?")] },
  { tag: "west-african", patterns: [word("west african"), word("west africa")] },
  { tag: "middle-eastern", patterns: [word("middle eastern"), word("levantine"), word("shawarma")] },
  { tag: "mediterranean", patterns: [word("mediterranean")] },
  { tag: "italian", patterns: [word("ital(?:y|ian)"), word("sicil(?:y|ian)"), word("tuscan")] },
  { tag: "french", patterns: [word("french"), word("france"), word("patisserie"), word("boulangerie")] },
  { tag: "portuguese", patterns: [word("portugal"), word("portuguese"), word("azorean"), word("azores")] },
  { tag: "spanish", patterns: [word("spain"), word("spanish"), word("paella")] },
  { tag: "greek", patterns: [word("greek"), word("greece"), word("souvlaki"), word("crete")] },
  { tag: "german", patterns: [word("german(?:y)?"), word("bavarian")] },
  { tag: "polish", patterns: [word("poland"), word("polish"), word("pierogi"), word("perog(?:y|ies)")] },
  { tag: "ukrainian", patterns: [word("ukraine"), word("ukrainian")] },
  { tag: "hungarian", patterns: [word("hungary"), word("hungarian")] },
  { tag: "dutch", patterns: [word("dutch"), word("netherlands"), word("stroopwafel")] },
  { tag: "belgian", patterns: [word("belgium"), word("belgian"), word("li[eè]ge")] },
  { tag: "british", patterns: [word("british(?! columbia)")] },
  { tag: "jamaican", patterns: [word("jamaica(?:n)?"), word("jerk"), word("jamrock")] },
  { tag: "trinidadian", patterns: [word("trinidad(?:ian)?"), word("doubles")] },
  { tag: "haitian", patterns: [word("haiti(?:an)?")] },
  { tag: "caribbean", patterns: [word("caribbean"), word("west indian")] },
  { tag: "mexican", patterns: [word("mexic(?:o|an)"), word("taco[sz]?"), word("tamales?"), word("esquites?")] },
  { tag: "colombian", patterns: [word("colombia(?:n)?")] },
  { tag: "brazilian", patterns: [word("brazil(?:ian)?")] },
  { tag: "argentinian", patterns: [word("argentina(?:n)?"), word("gaucho")] },
  { tag: "peruvian", patterns: [word("peru(?:vian)?")] },
  { tag: "venezuelan", patterns: [word("venezuela(?:n)?")] },
  { tag: "guatemalan", patterns: [word("guatemala(?:n)?")] },
  { tag: "bolivian", patterns: [word("bolivia(?:n)?")] },
  { tag: "salvadoran", patterns: [word("el salvador"), word("salvadoran"), word("salvadorian"), word("pupusas?")] },
  { tag: "indian", patterns: [word("(?<!west )india(?:n)?"), word("masala"), word("tandoor"), word("samosas?"), word("naan"), word("chapatis?")] },
  { tag: "pakistani", patterns: [word("pakistan(?:i)?")] },
  { tag: "nepali", patterns: [word("nepal(?:i|ese)?")] },
  { tag: "tibetan", patterns: [word("tibet(?:an)?")] },
  { tag: "chinese", patterns: [word("chinese food"), word("chinese cuisine"), word("sichuan"), word("szechuan"), word("cantonese")] },
  { tag: "taiwanese", patterns: [word("taiwan(?:ese)?")] },
  { tag: "japanese", patterns: [word("japan(?:ese)?"), word("onigiri"), word("sushi"), word("ramen")] },
  { tag: "korean", patterns: [word("korea(?:n)?")] },
  { tag: "vietnamese", patterns: [word("vietnam(?:ese)?"), word("pho"), word("banh mi")] },
  { tag: "thai", patterns: [word("thai(?! dye)"), word("thailand")] },
  { tag: "filipino", patterns: [word("filipino"), word("philippines?")] },
  { tag: "malaysian", patterns: [word("malaysia(?:n)?")] },
  { tag: "cambodian", patterns: [word("cambodia(?:n)?")] },
  { tag: "lebanese", patterns: [word("leban(?:on|ese)")] },
  { tag: "persian", patterns: [word("persian"), word("iran(?:ian)?"), word("gilani")] },
  { tag: "turkish", patterns: [word("turkish"), word("gozlemes?")] },
  { tag: "syrian", patterns: [word("syria(?:n)?")] },
  { tag: "afghan", patterns: [word("afghan(?:istan)?")] },
  { tag: "ethiopian", patterns: [word("ethiopia(?:n)?"), word("injera")] },
  { tag: "eritrean", patterns: [word("eritrea(?:n)?")] },
  { tag: "somali", patterns: [word("somali(?:a)?")] },
  { tag: "nigerian", patterns: [word("nigeria(?:n)?"), word("jollof")] },
  { tag: "ghanaian", patterns: [word("ghana(?:ian)?")] },
  { tag: "moroccan", patterns: [word("morocco"), word("moroccan")] },
  { tag: "egyptian", patterns: [word("egypt(?:ian)?")] },
];

const NAME_HINTS: Hint[] = [
  { tag: "italian", patterns: [word("gelato"), word("pasta")] },
  { tag: "french", patterns: [word("crepes?")] },
  { tag: "turkish", patterns: [word("gozlemes?")] },
  { tag: "tibetan", patterns: [word("momos?")] },
  { tag: "nepali", patterns: [word("momos?")] },
  { tag: "korean", patterns: [word("kimchi")] },
  { tag: "german", patterns: [word("pretzels?")] },
  { tag: "portuguese", patterns: [word("churrascos?")] },
  { tag: "venezuelan", patterns: [word("arepas?")] },
];

const DROP_WHEN: Array<{ test: RegExp; drop: CountryTag[] }> = [
  { test: /watercolor|stationery/, drop: ["french"] },
  { test: /tutoring/, drop: ["french", "british"] },
  { test: /lavender/, drop: ["french", "british"] },
  { test: /french fries?/, drop: ["french"] },
  { test: /italian chestnuts?|italian sausage/, drop: ["italian"] },
  { test: /japanese maple/, drop: ["japanese"] },
  { test: /(?:fine|bone) china|chinaware/, drop: ["chinese"] },
  { test: /tie-?dye/, drop: ["thai"] },
  { test: /jewellery|jewelry|hill tribe/, drop: ["thai", "cambodian"] },
  { test: /wagyu/, drop: ["japanese"] },
  { test: /tartary buckwheat/, drop: ["chinese"] },
  { test: /non-alcoholic beer/, drop: ["french", "belgian"] },
];

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function unique(tags: CountryTag[]) {
  const seen = new Set<CountryTag>();
  const next: CountryTag[] = [];
  for (const tag of tags) {
    if (!COUNTRY_SET.has(tag) || seen.has(tag)) continue;
    seen.add(tag);
    next.push(tag);
  }
  return next;
}

function withRollups(tags: CountryTag[]) {
  const next = [...tags];
  for (const tag of tags) {
    for (const extra of ROLLUP[tag] ?? []) next.push(extra);
  }
  return unique(next);
}

function matchHints(hay: string, hints: Hint[]) {
  const tags: CountryTag[] = [];
  for (const hint of hints) {
    if (hint.patterns.some((pattern) => pattern.test(hay))) tags.push(hint.tag);
  }
  return tags;
}

export function isCountryTag(tag: string): tag is CountryTag {
  return COUNTRY_SET.has(tag);
}

export function guessCountryTags(name: string, about: string | null | undefined = "") {
  const hay = fold(`${name} ${about ?? ""}`);
  const fromCopy = matchHints(hay, HINTS);
  const fromName = matchHints(fold(name), NAME_HINTS);
  let tags = unique([...fromCopy, ...fromName]);

  for (const rule of DROP_WHEN) {
    if (rule.test.test(hay)) {
      tags = tags.filter((tag) => !rule.drop.includes(tag));
    }
  }
  if (tags.includes("taiwanese")) {
    tags = tags.filter((tag) => tag !== "chinese");
  }
  if (tags.includes("nepali") && tags.includes("tibetan")) {
    if (/tibet/.test(hay) && !/nepal/.test(hay)) {
      tags = tags.filter((tag) => tag !== "nepali");
    } else if (/nepal/.test(hay) && !/tibet/.test(hay)) {
      tags = tags.filter((tag) => tag !== "tibetan");
    }
  }
  if (/west indian/.test(hay)) {
    tags = tags.filter((tag) => tag !== "indian");
  }

  return withRollups(tags);
}

export function countryTagsFromQuery(q: string) {
  const hay = fold(q).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!hay) return [] as CountryTag[];
  const tags: CountryTag[] = [];
  for (const { tag, needles } of QUERY_ALIASES) {
    if (needles.some((needle) => hay.includes(needle))) tags.push(tag);
  }
  return unique(tags).filter((tag) => {
    if (tag === "indian" && /\bwest indian\b/.test(hay)) return false;
    if (tag === "british" && /british columbia/.test(hay) && !/british(?! columbia)/.test(hay)) {
      return false;
    }
    return true;
  });
}

export function storedCountryTags(tags: string[]) {
  return tags.filter((tag): tag is CountryTag => COUNTRY_SET.has(tag));
}

export function withVendorCountryTags<T extends { name: string; about?: string | null; tags: string[] }>(
  vendor: T,
): T {
  if (storedCountryTags(vendor.tags).length) return vendor;
  const extra = guessCountryTags(vendor.name, vendor.about);
  if (!extra.length) return vendor;
  return { ...vendor, tags: [...vendor.tags, ...extra] };
}
