/** Seeded public review aggregates from the directory. Live rows come from Supabase. */
export type ReviewStats = {
  review_count: number;
  rating_avg: number;
};

export const marketReviewStats: Record<string, ReviewStats> = {
  "cabbagetown-farmers-market": {
    "review_count": 44,
    "rating_avg": 4.4
  },
  "davisville-village-market": {
    "review_count": 59,
    "rating_avg": 4.5
  },
  "downsview-park-merchants-market": {
    "review_count": 3582,
    "rating_avg": 4.29
  },
  "dufferin-grove-organic-farmers-market": {
    "review_count": 115,
    "rating_avg": 4.68
  },
  "east-lynn-park-farmers-market": {
    "review_count": 12,
    "rating_avg": 3.2
  },
  "east-york-farmers-market": {
    "review_count": 26,
    "rating_avg": 4.8
  },
  "eglinton-way-bia-farmers-market": {
    "review_count": 12,
    "rating_avg": 4.9
  },
  "etobicoke-civic-centre-farmers-market": {
    "review_count": 2,
    "rating_avg": 4
  },
  "evergreen-brick-works-saturday-farmers-market": {
    "review_count": 62,
    "rating_avg": 4.4
  },
  "gould-street-tmu": {
    "review_count": 1,
    "rating_avg": 4
  },
  "humber-bay-shores-farmers-market": {
    "review_count": 309,
    "rating_avg": 4.5
  },
  "leslieville-farmers-market-east-end-food-hub": {
    "review_count": 399,
    "rating_avg": 4.7
  },
  "montgomerys-inn-farmers-market": {
    "review_count": 22,
    "rating_avg": 4.4
  },
  "north-york-farmers-market": {
    "review_count": 22,
    "rating_avg": 4.5
  },
  "sickkids-market": {
    "review_count": 5,
    "rating_avg": 3.8
  },
  "sickkids-market-indoor-winter": {
    "review_count": 5,
    "rating_avg": 3.8
  },
  "sorauren-farmers-market": {
    "review_count": 186,
    "rating_avg": 4.71
  },
  "st-lawrence-farmers-market": {
    "review_count": 101,
    "rating_avg": 3.9
  },
  "st-lawrence-market": {
    "review_count": 57234,
    "rating_avg": 4.55
  },
  "the-junction-farmers-market": {
    "review_count": 170,
    "rating_avg": 4.5
  },
  "the-leslieville-farmers-market": {
    "review_count": 399,
    "rating_avg": 4.7
  },
  "the-stops-farmers-market": {
    "review_count": 15,
    "rating_avg": 4
  },
  "trinity-bellwoods-farmers-market": {
    "review_count": 152,
    "rating_avg": 4.38
  },
  "underpass-park-farmers-market": {
    "review_count": 44,
    "rating_avg": 4.5
  },
  "utsc-community-market": {
    "review_count": 1,
    "rating_avg": 5
  },
  "withrow-park-farmers-market": {
    "review_count": 152,
    "rating_avg": 4.6
  }
};

export const vendorReviewStats: Record<string, ReviewStats> = {
  "backed-by-bees-honey": {
    "review_count": 3,
    "rating_avg": 5
  },
  "big-johns-country-market": {
    "review_count": 10,
    "rating_avg": 4.8
  },
  "broken-stone-winery": {
    "review_count": 313,
    "rating_avg": 4.57
  },
  "buster-s-sea-cove": {
    "review_count": 2262,
    "rating_avg": 3.97
  },
  "carousel-bakery": {
    "review_count": 268,
    "rating_avg": 3.5
  },
  "churrasco-s": {
    "review_count": 16,
    "rating_avg": 4.1
  },
  "classic-juice-co": {
    "review_count": 9,
    "rating_avg": 5
  },
  "crepe-it-up-cafe": {
    "review_count": 41,
    "rating_avg": 3.7
  },
  "everyday-gourmet": {
    "review_count": 243,
    "rating_avg": 4.62
  },
  "fifth-town-artisan-cheese": {
    "review_count": 76,
    "rating_avg": 4
  },
  "future-bakery": {
    "review_count": 56,
    "rating_avg": 2.9
  },
  "goldenfield-brewery": {
    "review_count": 153,
    "rating_avg": 4.8
  },
  "goodlot-farm-brewing": {
    "review_count": 375,
    "rating_avg": 4.8
  },
  "goodlot-farmstead-brewing-company": {
    "review_count": 375,
    "rating_avg": 4.8
  },
  "gouter": {
    "review_count": 291,
    "rating_avg": 4.68
  },
  "great-lakes-brewery": {
    "review_count": 404,
    "rating_avg": 4.4
  },
  "hammerhead-s-fresh": {
    "review_count": 2,
    "rating_avg": 5
  },
  "henderson-brewing": {
    "review_count": 707,
    "rating_avg": 4.48
  },
  "henry-of-pelham": {
    "review_count": 525,
    "rating_avg": 4.74
  },
  "heritage-estate-winery-and-cidery": {
    "review_count": 274,
    "rating_avg": 4.5
  },
  "hinterland-wine": {
    "review_count": 438,
    "rating_avg": 4.42
  },
  "hooked": {
    "review_count": 133,
    "rating_avg": 4.5
  },
  "house-of-empanadas": {
    "review_count": 340,
    "rating_avg": 4.9
  },
  "island-oysters": {
    "review_count": 381,
    "rating_avg": 4.9
  },
  "juno-veterinary": {
    "review_count": 59,
    "rating_avg": 4.9
  },
  "kinsip": {
    "review_count": 477,
    "rating_avg": 4.45
  },
  "kinsip-house-of-fine-spirits": {
    "review_count": 477,
    "rating_avg": 4.45
  },
  "knuckle-down-farm": {
    "review_count": 1,
    "rating_avg": 5
  },
  "kozlik-s-canadian-mustard": {
    "review_count": 129,
    "rating_avg": 4.7
  },
  "left-field-brewery": {
    "review_count": 983,
    "rating_avg": 4.74
  },
  "lev-bakery": {
    "review_count": 22,
    "rating_avg": 4.8
  },
  "little-beasts-brewing-company": {
    "review_count": 283,
    "rating_avg": 4.79
  },
  "mabel-s-bakery": {
    "review_count": 561,
    "rating_avg": 4.25
  },
  "mad-mexican": {
    "review_count": 1761,
    "rating_avg": 4.3
  },
  "magic-oven": {
    "review_count": 31,
    "rating_avg": 3.3
  },
  "maizal-tortilleria": {
    "review_count": 110,
    "rating_avg": 4.2
  },
  "mike-s-fish-market": {
    "review_count": 20,
    "rating_avg": 4.6
  },
  "nepali-momo": {
    "review_count": 13,
    "rating_avg": 4.8
  },
  "nepali-momos": {
    "review_count": 13,
    "rating_avg": 4.8
  },
  "oodles-of-strudels": {
    "review_count": 6,
    "rating_avg": 4
  },
  "ostrich-land": {
    "review_count": 453,
    "rating_avg": 4.74
  },
  "ostrich-land-the-power-of-ostrich": {
    "review_count": 453,
    "rating_avg": 4.74
  },
  "paddington-s-pump-restaurant": {
    "review_count": 1395,
    "rating_avg": 4.15
  },
  "petit-thuet-bakery": {
    "review_count": 104,
    "rating_avg": 3.9
  },
  "pilliteri-estate-winery": {
    "review_count": 1874,
    "rating_avg": 4.61
  },
  "rainhard-brewing-company": {
    "review_count": 287,
    "rating_avg": 4.7
  },
  "real-empanada": {
    "review_count": 17,
    "rating_avg": 4.5
  },
  "red-tape": {
    "review_count": 130,
    "rating_avg": 4.8
  },
  "red-tape-brewery": {
    "review_count": 130,
    "rating_avg": 4.8
  },
  "reid-s-distillery": {
    "review_count": 757,
    "rating_avg": 4.89
  },
  "revel-cider": {
    "review_count": 85,
    "rating_avg": 4.9
  },
  "robinson-bread": {
    "review_count": 154,
    "rating_avg": 4.7
  },
  "sheldon-creek-dairy": {
    "review_count": 9,
    "rating_avg": 4.5
  },
  "sonnen-hill-brewing": {
    "review_count": 108,
    "rating_avg": 4.9
  },
  "st-john-s-bakery": {
    "review_count": 150,
    "rating_avg": 4.8
  },
  "st-urbain-bagel": {
    "review_count": 415,
    "rating_avg": 3.8
  },
  "stanners-vineyard": {
    "review_count": 91,
    "rating_avg": 4.7
  },
  "steadfast-brewing": {
    "review_count": 156,
    "rating_avg": 4.8
  },
  "tasso": {
    "review_count": 186,
    "rating_avg": 4.8
  },
  "ukrainian-store-dnister": {
    "review_count": 21,
    "rating_avg": 3.83
  },
  "uno-mustachio": {
    "review_count": 621,
    "rating_avg": 4.28
  },
  "vital-life-vegan": {
    "review_count": 5,
    "rating_avg": 5
  },
  "willibald-farm-distillery-brewery": {
    "review_count": 773,
    "rating_avg": 4.69
  },
  "willowtree-farm": {
    "review_count": 11,
    "rating_avg": 4.5
  },
  "wine-country-merchants": {
    "review_count": 2,
    "rating_avg": 2.5
  },
  "yianni-s-kitchen": {
    "review_count": 28,
    "rating_avg": 3.5
  },
  "yip-s-kitchen": {
    "review_count": 165,
    "rating_avg": 4.3
  }
};
