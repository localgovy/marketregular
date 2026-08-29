-- Two sourcing frames repeated across the directory read as generated text:
--   * 21 market abouts hedged every fact with "Official copy describes / Official
--     pages describe / Official 2026 copy lists".
--   * 25 vendor abouts opened with the data-entry label "Market items include:".
--
-- Every fact is kept. Only the frame is removed, so each listing reads as its own
-- sentence instead of a filled-in template. A few typos are corrected in passing
-- (parley, apple turn overs, flavors).
--
-- No column changes, so a revert is a content-only re-run of the previous values.

update public.markets as m
set about = v.about
from (values
  ('acton-outdoor-market', 'Weekly Thursday-evening market operated by the Downtown Acton BIA at Prospect Park, continuing the former Acton Farmers’ Market. Local goods, handmade products, artisan creations and food, steps from downtown shops and restaurants.'),
  ('afro-caribbean-farmers-market', 'The Afro-Caribbean Farmers’ Market connects Black farmers, growers and food businesses with Little Jamaica, in the Little Jamaica–Afro Caribbean Cultural District. Stalls carry culturally appropriate Caribbean and African produce, local urban-farm harvests, baked goods, bread, juices, preserves, sauces and artisan products.'),
  ('aurora-farmers-market-artisan-fair', 'Since 2002, the Aurora Farmers'' Market and Artisan Fair has hosted local farmers, food vendors, artisans and community groups in dog-friendly Town Park. Live music and children''s crafts every Saturday.'),
  ('bloor-borden-farmers-market', 'Bloor.Borden Farmers’ Market is a Wednesday market in the Annex, in the Green P lot at 300 Borden Street just south of Bloor. Local fruit, vegetables, meats, dairy and more, rain or shine.'),
  ('brampton-farmers-market', 'The City of Brampton’s Saturday farmers’ market runs downtown on Main Street North between Queen Street and Theatre Lane / Nelson Street West. Fresh produce, prepared foods and handcrafted goods, and many Brampton-based entrepreneurs got their start at the market.'),
  ('bronte-farmers-market', 'A Bronte Village BIA community market in Bronte Market Square: just-picked produce, artisanal baked goods, handcrafted items and ready-to-enjoy bites from local food makers, with live music in the square.'),
  ('burlington-centre-lions-farmers-market', 'Outdoor farmers'' market operated by the Burlington Lions Club since 1959, at Burlington Centre since 1968. Local growers, food producers and artisans, with stall-rental proceeds funding Lions community programs.'),
  ('dufferin-grove-organic-farmers-market', 'Established in 2002 at Dufferin Grove Park, this year-round market connects local and predominantly organic farmers and food producers with the surrounding community. A park-based market committed to sustainable agriculture and to access regardless of socio-economic status.'),
  ('east-lynn-park-farmers-market', 'East Lynn Park Farmers’ Market at 1949 Danforth Avenue is run with volunteers from the Danforth East Community Association. Farmers sell what they grow, alongside specialty food and drink vendors, weekly live music, a Kidpreneur program and community pop-ups.'),
  ('georgetown-farmers-market', 'Since 1993, the Downtown Georgetown Farmers Market has been a Saturday tradition on Main Street South, run as a subcommittee of the Georgetown Central BIA. Vendors bring Ontario-grown and locally made goods, with 70% of each vendor''s produce from their own farm or operation: certified organic produce, honey, maple syrup, jams, baked goods, deli products, flowers and artisan work.'),
  ('georgina-farmers-market', 'The Georgina Farmers'' Market at The LINK in Sutton supports local farmers, bakers, artisans and small businesses, with farm-fresh produce, homemade goods, handcrafted items and live entertainment.'),
  ('leslieville-farmers-market-east-end-food-hub', 'Indoor season of The Leslieville Farmers’ Market at the East End Food Hub, 1470 Gerrard Street East. Sundays run here before and after the Greenwood Park outdoor season, with fresh produce, artisanal goods, small-scale producers and handmade crafts.'),
  ('milton-farmers-market', 'The Milton Chamber of Commerce operates this Saturday-morning market on a closed stretch of Main Street between James Street and Martin Street, with more than 40 farmers, vendors, florists and artisans. Fruit and produce, meats, homemade sauces, baked goods and flowers. Admission and parking are free.'),
  ('the-junction-farmers-market', 'The Junction Farmers Market is an independent nonprofit Saturday market in Baird Park. It sells local, sustainably produced fresh food, supports growers and producers, and works on access to healthy food for everyone in and around the Junction.'),
  ('the-stops-farmers-market', 'The Stop’s year-round Saturday market at Wychwood Barns hosts more than 35 farmers and prepared-food vendors: produce, meat, dairy, beverages, pickles and ferments, plus weekly pop-ups, a community table and local music. Outdoors along the Barns’ walkways from May to October; indoors in the main Barn from November to April.'),
  ('underpass-park-farmers-market', 'A seasonal Thursday community market in Underpass Park in Corktown, with fresh produce and meat, prepared foods, local arts and crafts, and live music.'),
  ('uxbridge-farmers-market', 'An award-winning Sunday market, running since 2000, for local farmers, artisans, makers and bakers. More than 50 weekly vendors bring farm-fresh produce, flowers, honey, locally raised meat, preserves, prepared food and handcrafted goods to The Second Wedge Brewing Co.'),
  ('uxbridge-farmers-market-holiday', 'Indoor holiday edition of the Uxbridge Farmers'' Market at the Uxbridge Arena. Each holiday market brings more than 30 farmers, artisans, makers and bakers with fresh local produce, specialty artisanal food and drink, and handcrafted gifts.'),
  ('village-market-waldorf', 'Village Market is a Saturday farmers’ market at Toronto Waldorf School, celebrating 34 years of connecting organic farmers and producers with the community.'),
  ('woodbridge-village-farmers-market', 'A non-profit, volunteer-run market affiliated with the Woodbridge Agricultural Society. Its farmers work in or near the Greenbelt, and the market centres on local agriculture, healthy food and community. For 2026 it runs at Al Palladini Community Centre because of construction at Woodbridge Memorial Arena.'),
  ('yum-market', 'Regenesis runs YUM! Market at York University for residents, visitors and students. It looks for organic or sustainable farmers and locally made food, crafts and household goods, with a mandate of fresh, healthy, locally grown or sourced products and low environmental impact.')
) as v(slug, about)
where m.slug = v.slug;

update public.vendors as x
set about = v.about
from (values
  ('back-road-coffee-roasters', 'Back Road Coffee Roasters pours cold brew, nitro coffee, iced lattes and hot tea at the market.'),
  ('bees-are-life', 'Bees are Life brings honey, beeswax, candles, honey vinegar and honey butter to the market.'),
  ('big-johns-country-market', 'Big Johns Country Market sells beef sausage, summer sausage, steak and hamburgers, alongside maple syrup and a few vegetables.'),
  ('cacchito-from-mexico', 'Cacchito From Mexico serves Mexican prepared corn, esquites, tamales and churros.'),
  ('campagna-farm', 'Campagna Farm brings greens, fruit and goat cheese to the market.'),
  ('cathy-s-kombucha', 'Cathy’s Kombucha pours six assorted flavours of kombucha.'),
  ('dianel-s-farm-holland-marsh', 'Dianel’s Farm grows Holland Marsh rhubarb, radishes, spinach, mint, garlic, onions, tomatoes, basil, strawberries, sprouts, cucumber and asparagus, and sells herb pots.'),
  ('gamble-farms-microgreens', 'Gamble Farms Microgreens sells peas, garlic and microgreens.'),
  ('go-bananas', 'Go Bananas makes banana pudding.'),
  ('grandpa-ken-s-mcj', 'Grandpa Ken’s MCJ grills back bacon, burgers, sausages and hotdogs, with soft drinks.'),
  ('great-lakes-brewery', 'Great Lakes Brewery brings a rotating range of its beers to the market.'),
  ('jerry-s-berries-raspberry-farm', 'Jerry’s Berries Raspberry Farm sells raspberries, raspberry honey and other honey products.'),
  ('juice-bar', 'Juice Bar makes freshly blended smoothies and freshly pressed juices.'),
  ('kopi-thyme', 'Kopi Thyme sells sauces for cooking.'),
  ('marigold-s-maple-syrup', 'Marigold’s Maple Syrup sells maple syrup and honey.'),
  ('my-tea-brew', 'My Tea Brew sells loose-leaf teas and hand-crafted tea blends.'),
  ('nourished-roots-market-garden', 'Nourished Roots Market Garden grows beets, peppers, parsley, and leaf and romaine lettuce.'),
  ('pilliteri-estate-winery', 'Pillitteri Estate Winery brings VQA wines and a range of ice wines.'),
  ('reid-s-distillery', 'Reid''s Distillery brings its gin varieties to the market.'),
  ('reimer-vineyards', 'Reimer Vineyards sells organic wines.'),
  ('soul-bread-company', 'Soul Bread Company bakes bread, croissants, apple turnovers, quiches and pizza.'),
  ('that-pretzel-dough', 'That Pretzel Dough bakes almond croissants, pretzel bagels, pretzel baguettini, pretzel twists, chocolate-covered mini pretzels and almond biscotti.'),
  ('the-bakers-kitchen', 'The Bakers Kitchen makes pierogi, schnitzels and cabbage rolls.'),
  ('the-boots-farm', 'The Boots Farm brings vegetables and fruit to the market.'),
  ('the-happy-baker', 'The Happy Baker bakes cookies, pies and scones.')
) as v(slug, about)
where x.slug = v.slug;
