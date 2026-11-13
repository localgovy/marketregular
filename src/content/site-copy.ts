/**
 * Titles, headings, labels, and captions.
 * Edit the words in this file. Each block is the URL where they show.
 *
 * Placeholders fill in when the page renders:
 * {brand}     MarketRegular
 * {city}      Toronto, unless that page names another city
 * {region}    GTA
 * {coverage}  Toronto, including the GTA
 * {tagline}   the footer line in "every page"
 * {stall}     that stall's name
 * {market}    that market's name
 * {category}  a product category
 * {area}      a neighbourhood
 * {day}       a weekday
 * {query}     the search text
 * {count}     a number
 * {qualifier} a short place note on a market title
 * {effective} the date on Terms or Privacy
 * {entity}    the legal name on Privacy
 *
 * Market names, stall names, product names, prices, and hours are not listed
 * here. A page that repeats is written once, as /markets/[slug].
 */
import { SITE_NAME } from "@/lib/constants";
import { LAUNCH_CITY, LAUNCH_COVERAGE, LAUNCH_REGION } from "@/lib/launch";

export const siteCopy = {
  "every page": {
    tagline: "Toronto farmers' markets, all in one place",
    /** Browser tab on the home page, and the default title for the site. */
    documentTitle: "{brand} - {tagline}",
    searchPlaceholder: "Search anything {brand}",
    searchPlaceholderShort: "Search MR",
    searchLabel: "Search markets and vendors",
    wordmark: "{brand} home",
    navLabel: "Primary",
    footerNavLabel: "Footer",
    legalNavLabel: "Privacy and terms",
    back: "Back",
    nav: {
      home: "Home",
      calendar: "Calendar",
      markets: "Markets",
      products: "Products",
      blog: "Blog",
      saved: "Saved",
      feed: "Feed",
      about: "About",
      vendorPortal: "Vendor portal",
      marketPortal: "Market portal",
      privacy: "Privacy",
      terms: "Terms",
    },
    /** Header button. The menu items are the portal names below. */
    portalButton: "Portal",
    portalButtonLabel: "Market/Vendor Portal",
    portalMenu: {
      market: "Market Portal",
      vendor: "Vendor Portal",
    },
    account: "Account",
    signIn: "Sign in",
    yourMarket: "Your market",
    yourStall: "Your stall",
    admin: "Admin",
    save: "Save",
    saved: "Saved",
    saveArticle: "Save Article",
    savedArticle: "Saved Article",
    saveInfo: "Save Info",
    savedInfo: "Saved Info",
    saveThisMarket: "this market",
    saveThisVendor: "this vendor",
    saveThisNote: "this note",
    saveNamed: "Save {item}",
    unsaveNamed: "Remove {item} from saved",
    savedCount: "Saved, {count}",
    status: {
      open: "Open",
      openNow: "Open now",
      sellingNow: "Selling now",
      hallOpen: "Hall open",
    },
  },

  "/": {
    /** The main heading cycles these after the city name. */
    titlePhrases: ["farmers' markets", "vendors", "local products"],
    ledeBefore:
      "Find everything from the products you enjoy every weekend to the markets and vendors that sell them,",
    ledeEmphasis: "all in one place",
    coverage: "Find products, vendors, and markets from all over Toronto, the GTA, and surrounding areas.",
    hallOpenNow: "hall open now",
    hallsOpenNow: "halls open now",
    vendorsActiveToday: "vendors active today",
    fullCatalogue: "Full product catalogue",
    censusLabel: "On the directory",
    priorityVendors: "Priority vendors",
    vendors: "vendors",
    products: "Products",
    menuItems: "menu items",
    neighbourhoods: "Neighbourhoods",
    markets: "markets",
    nearMe: "Markets near me",
    locating: "Locating…",
    searchDirectory: "Search directory",
    go: "Go",
    cravings: "Cravings",
    previousCraving: "Previous craving",
    nextCraving: "Next craving",
    featured: "Featured vendors, products & markets",
    vendorMarks: "Vendor marks:",
    featuredEmblems: "Featured vendor emblems",
    resetFilters: "Reset filters",
    allVendorsCount: "All {count} vendors",
    category: "Category",
    allVendors: "All vendors",
    neighbourhood: "Neighbourhood",
    allAreas: "All areas",
    when: "When",
    anyDay: "Any day",
    today: "Today",
    weekend: "Weekend",
    productsAndCategories: "Products & categories",
    allCategories: "All categories",
    selectCategory: "Select product category",
    productGuides: "{count} product guides",
    vendorsKnownFor: "Vendors known for {category}:",
    compareVendors: "Compare all vendors & prices",
    moreCategories: "More product categories:",
    categoryItems: "{count} items",
    marketsAtlas: "Markets & neighbourhood atlas",
    fullScreenMap: "Full screen map",
    toronto: "Toronto",
    aroundToronto: "Around Toronto",
    anchorVendors: "Anchor vendors setting up in {area}:",
    neighbourhoodMarkets: "Neighbourhood markets",
    sellingToday: "Selling today",
    vendorsOnTheFloor: "Vendors on the floor",
    activeCount: "{count} active",
    noVendorsOpen:
      "No vendors remain open at this hour today. Browse the upcoming week schedule or explore featured vendors above.",
    upcomingWeek: "upcoming week schedule",
    regularsPicks: "Regulars' picks",
    topVendors: "Top 5 vendors this week",
    shopperNotes: "Recent shopper notes & finds",
    viewAllPosts: "View all posts",
    noNotesYet: "No floor notes posted yet. Visit the live feed to share what is fresh from vendors.",
    liveFeed: "the live feed",
    upcomingSessions: "Upcoming sessions",
    fieldNote: "Field note",
    menuHighlights: "Menu highlights",
    openNowOnCard: "Open now",
  },

  "/markets": {
    title: "Find {city} farmers' markets",
    description:
      "All {markets} farmers' markets across {city} and the {region}, with this week's hours, addresses, maps and the {vendors} vendors that work them.",
    h1: "{city} farmers' markets",
    lede: "Type a food, a vendor, or a market. A match opens that food, that vendor, or that market's vendors.",
    searchPlaceholder: "Search products, markets, vendors",
    marketsInView: "Markets in view",
    vendorsInView: "Vendors in view",
    placesInView: "Places in view",
    noMatch: "No markets match",
    noMatchCaption: "Clear a specialty or a day to bring the directory back.",
    clearFilters: "Clear filters",
    when: "When",
    setup: "Setup",
    areas: "Areas",
    allAreas: "All areas",
    fewerAreas: "Fewer areas",
    moreAreas: "More areas ({count})",
    specialty: "Specialty",
    whatTheySell: "What they sell",
    cuisine: "Cuisine",
    diet: "Diet",
    howItsMade: "How it's made",
    indoor: "Indoor",
    outdoor: "Outdoor",
    yearRound: "Year-round",
    holiday: "Holiday market",
    productGuides: "Product guides",
    openTheGuide: "Open the {term} guide",
    removeFilter: "Remove {label}",
    marketsAndVendors: "Markets and vendors",
    nothingMatches: "Nothing matches that search",
    nothingMatchesCaption: "Try a food, a vendor, or a market. These guides list one food across every market.",
    everyVendor: "Every vendor that lists it",
    everyVendorTerm: "Every vendor that lists {term}",
    products: "Products",
    vendors: "Vendors",
    markets: "Markets",
    vendorsMatching: "Vendors matching “{query}”",
    noVendorsMatch: "No vendors at this market match.",
    nothingInSpecialty: "Nothing in view uses this specialty.",
    previousMarket: "Previous market",
    nextMarket: "Next market",
    fewer: "Fewer",
    more: "More ({count})",
    browseAnotherWay: "Browse another way",
    byDay: "By day",
    byWhatTheySell: "By what they sell",
    openToday: "Open today",
  },

  "/markets/[slug]": {
    titleWithQualifier: "{market} — {qualifier}",
    titleInCity: "{market} in {city}",
    hours: "Hours",
    about: "About",
    findThem: "Find them",
    directions: "Directions",
    vendors: "Vendors",
  },

  "/markets/day": {
    title: "{city} farmers' markets by day of the week",
    description:
      "Which {region} farmers' markets run on each day, Sunday through Saturday, with hours and how many vendors work each one.",
    crumb: "By day",
    h1: "{city} farmers' markets by day of the week",
    lede: "Most halls run one day a week, so the day decides where you can go.",
    nothingScheduled: "Nothing scheduled right now.",
    allDayMarkets: "All {count} {day} markets",
  },

  "/markets/day/[day]": {
    title: "{day} farmers' markets in {city}",
    h1: "{city} farmers' markets open on {day}",
    listName: "{city} farmers' markets open on {day}",
    crumb: "{day} markets",
  },

  "/markets/open-today": {
    title: "Farmers' markets open today in {city}",
    description:
      "Which {region} farmers' markets are open today and which are still to come, with hours, addresses and how many vendors are working.",
    crumb: "Open today",
    listName: "{city} farmers' markets open today",
    h1: "Farmers' markets open today in {city}",
    openRightNow: "Open right now",
    openingLater: "Opening later today",
    alreadyClosed: "Already closed today",
    tomorrow: "Tomorrow",
    allDayMarkets: "All {count} {day} markets",
  },

  "/markets/tag/[tag]": {
    /** The heading and the line under it come from that category. These are the section headings. */
    markets: "{count} market",
    marketsPlural: "{count} markets",
  },

  "/events": {
    title: "{city} market calendar",
    description: "Click on a day, find your market, and start planning your trip.",
    h1: "Calendar",
    lede: "Click on a day, find your market, and start planning your trip.",
    nextTwoDays: "Next two market days",
    thatDay: "That day",
  },

  "/feed": {
    title: "{city} feed",
    description: "Posts from {city} markets. What's for sale this week.",
    h1: "Feed",
    lede: "Posts from {city} markets. Filter by market, vendor, or what's for sale.",
    loading: "Loading posts…",
    reviews: "Reviews",
    allPosts: "All posts",
    inThisFeed: "In this feed",
    signIn: "Sign in",
  },

  "/products": {
    title: "Products",
    searchTitle: "{query} at {city} farmers' markets",
    description: "Search products and the vendors who sell them at {city} farmers' markets.",
    h1: "Products",
    lede: "Search what the stalls sell, or start from a category. Each product opens the vendors who list it and the markets where they set up.",
    searchPlaceholder: "Bread, eggs, honey, or a vendor",
    searchLabel: "Search products and vendors",
    filtersNeedQuery: "Add a product name to use selling today, a market, or a day.",
    jumpToResults: "Jump to search results",
    jumpToCatalogue: "Jump to product catalogue",
    productsMatching: "Products matching “{query}”",
    browseCategories: "Browse categories",
    vendors: "Vendors",
    noOtherVendors: "No other vendors match that name.",
    stallsSelling: "Stalls selling these items",
    curatedGuides: "Curated product guides",
    browseByCategory: "Browse by category",
    compareStalls: "Compare every stall that lists a staple across {city} farmers' markets.",
    categories: "Categories",
    allCategories: "All categories:",
    publishedMenus: "Stalls with published menus & prices",
    publishedMenusLabel: "Featured stalls with published menus",
    browseAllStalls: "Browse all {count} stalls",
  },

  "/find/[slug]": {
    /** The page title and the main heading are the product name. */
    stallsAndMenus: "Stalls & menu comparison",
    whereToBuy: "Where to buy {product}",
    publishedStalls: "Published stalls",
    where: "Where they set up",
    market: "market",
    markets: "markets",
    moreToCompare: "More to compare",
    moreInCategory: "More in {category}",
    popularGuides: "Popular product guides",
    all: "All →",
  },

  "/vendors/[slug]": {
    titleAtMarket: "{stall} at {market}",
    titleNoMarket: "{stall} — {city} farmers' markets",
    titleManyMarkets: "{stall} — {count} {city} farmers' markets",
    stallLine: "Toronto market stall",
    marketLocation: "Market location",
    marketLocations: "Market locations",
    productsAndMarkets: "Products & markets",
    publishedMenu: "Published menu",
    selectedMarket: "Selected market",
    menuKicker: "Menu & products",
    sells: "What {stall} sells",
    resetFilters: "Reset filters",
    specialtiesKicker: "Products & specialties",
    brings: "What {stall} brings to market",
    browseCategory: "Browse {category}",
    where: "Where they sell",
    market: "market",
    markets: "markets",
    selectMarket: "Select a market to inspect {stall}'s hours and fellow stalls selling alongside them.",
    contact: "Contact & direct links",
    specialties: "Stall specialties & tags",
    moreStalls: "More stalls to explore",
    otherStalls: "Other stalls known for {category}",
    browseAllStalls: "Browse all {category} stalls",
    menuHighlights: "Menu highlights",
    guidesKicker: "Product categories & guides",
    compareByCategory: "Compare Toronto market stalls by category",
    allCategories: "All product categories",
    itemOnMenu: "{count} item on this menu",
    itemsOnMenu: "{count} items on this menu",
    marketGuide: "Toronto market guide",
    browse: "Browse →",
    notes: "Shopper notes & reviews",
    notesCaption: "Notes from regulars who stopped by {stall}.",
  },

  "/vendors/[slug]/buy/[itemId]": {
    title: "Buy",
    description: "Pay a stall on {brand}.",
    stallTerms: "Stall terms",
  },

  "/vendors/[slug]/orders/[orderId]": {
    title: "Order",
    description: "An order on {brand}.",
    confirming: "Payment is confirming",
    confirmingCaption: "Payment is still confirming. Refresh this page.",
    notFinished: "Payment not finished",
    ready: "Ready for pickup",
    reservation: "Reservation",
    placed: "Order placed",
    theStall: "The stall",
    stallTerms: "Stall terms",
  },

  "/saved": {
    title: "Saved markets, vendors, products, and notes",
    description: "Markets, vendors, products, blog posts, and reviews saved to your account.",
    h1: "Saved",
    ledeSignedIn: "Markets, vendors, products, blog posts, and reviews on this account.",
    ledeSignedOut: "Sign in to keep markets, vendors, and products on a list that follows you.",
    popular: "Popular in {city}",
    signIn: "Sign in",
    loadFailed: "Couldn't load your saves. Refresh the page.",
    markets: "Markets",
    vendors: "Vendors",
    noMarkets: "No markets on the list.",
    emptySignedIn:
      "Nothing saved yet. Open a market, a vendor, a product, or a note and press Save. The list follows this account.",
    emptySignedOut: "Sign in to save markets, vendors, products, and notes to this account.",
  },

  "/account": {
    title: "Account",
    description: "Your {brand} account — saved markets, notes, this week’s hours, and reviews.",
    profile: "Your profile",
    lede: "Your {brand} identity. Post notes, save markets, and keep this week's hours in one profile.",
    orders: "Orders",
    markets: "Markets",
    stalls: "Stalls",
    noMarkets: "No markets on the list.",
  },

  "/account/password": {
    title: "New password",
    description: "Set a new password for your account.",
    h1: "New password",
    choose: "Choose your password",
    lede: "Choose a password you have not used here before. At least 8 characters.",
    ledeForced:
      "Enter the password from the email, then choose the one you will use from now on. At least 8 characters. If that email did not arrive, sign out and use Forgot password on the sign-in page.",
    signOut: "Sign out",
  },

  "/blog": {
    title: "Blog",
    description: "Find out the latest schedules, vendors, and tidbits from your favourite farmers' markets in {city}.",
    h1: "Blog",
    lede: "Find out the latest schedules, vendors, and tidbits from your favourite farmers' markets in {city}.",
    empty: "No notes yet.",
  },

  "/blog/[slug]": {
    /** The heading is the post title. */
    missingTitle: "Blog",
  },

  "/about": {
    title: "About",
    description: "Why {brand} exists: so people in {coverage} can buy Canadian food from the vendor that grew it.",
    h1: "About",
    lede: "{brand} is the totally free all-in-one guide to shop local markets in {city}. Find a market, see who is selling, and save the ones you actually go to.",
    buyCanadian: "Buy Canadian",
    why: "Why {brand}?",
    findAMarket: "Find a market",
    thisMonthsDays: "This month's days",
    team: "The Team",
    founder: "Founder of {brand}",
  },

  "/contact": {
    title: "Contact",
    description: "Write {brand}, or open a market or vendor account.",
    h1: "Contact",
    lede: "Open a market or vendor account, or write to us.",
    runAListing: "Run a listing",
    runAListingCaption: "Create the account in the portal. After we assign the listing, you can edit it there.",
    marketAccount: "Market account",
    vendorAccount: "Vendor account",
    writeUs: "Write us",
    founder: "Founder of {brand}",
  },

  "/login": {
    title: "Sign in",
    description: "Sign in to save markets across browsers and post reviews.",
    h1: "Sign in",
    lede: "Saved markets and reviews follow this account. Browsing stays open.",
    ledeCheckout: "The order and the receipt stay with this account.",
    accountsConnecting: "Accounts are still connecting",
    directoryOpen: "The directory is open.",
    resetCaption: "We'll email a link to set a new password.",
    email: "Email",
    password: "Password",
    sendReset: "Send reset link",
    sending: "Sending…",
    orEmail: "or use email",
    submit: "Sign in",
    signingIn: "Signing in…",
    forgot: "Forgot password",
    noAccount: "No account?",
    createOne: "Create one",
  },

  "/signup": {
    title: "Create an account",
    description: "Create an account to save markets across browsers and post reviews.",
    h1: "Create an account",
    lede: "A name for posts, then email and a password — or continue with Google.",
    nameOnPosts: "Name on posts",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    creating: "Creating…",
    createAccount: "Create account",
    already: "Already have an account?",
    signIn: "Sign in",
  },

  "/onboarding": {
    title: "Set up your profile",
    description: "Pick a handle and three {brand} markets.",
    step: "Step {step} of 3",
    handle: "Your handle",
    threeMarkets: "Three markets",
    how: "How this works",
  },

  "/auth/confirm": {
    title: "Finish signing in",
    description: "Confirm this email link to finish signing in.",
    h1: "Finish signing in",
    lede: "This link only works once. Continue here so a mail preview does not use it up.",
    continue: "Continue",
  },

  "/auth/callback": {
    title: "Signing in",
    h1: "Signing in",
    lede: "Continuing…",
  },

  "/vendor": {
    title: "Vendor Portal",
    description: "Create an account to update the {brand} stall you run.",
    h1: "Vendor Portal",
    lede: "Create an account with the email you use for the business, or sign in if you already have one. A Gmail address is fine. Ask only if you run the stall, or the person who does has asked you to. After we assign it, you can edit it here.",
    createAccount: "Create an account",
    signIn: "Sign in",
    how: "How this works",
    stepAccount: "Create an account using the email you use for the business.",
    stepWait: "Wait for {brand}'s approval email.",
    stepEdit: "Edit the stall page. Keep the days, menu, and contact details current.",
    unavailable: "The stall editor is not available yet. Try again in a minute.",
    ledeHasListings:
      "Update the name, menu, and the markets you sell at. Changes show on the public page. Keep the days and the menu current.",
    published: "Published",
    draft: "Draft",
  },

  "/vendor/[id]": {
    title: "Edit your stall",
    description: "Update a {brand} stall you run.",
    unavailableTitle: "Your stall",
    unavailable: "The stall editor is not available yet. Try again in a minute.",
    published: "Published.",
    viewPublic: "View the public page",
    hiddenUntilHall: "Published. The public page is hidden until you add a hall.",
    draft: "Draft. This listing is not on the public site yet.",
    selling: "Selling",
    profile: "Profile",
    logo: "Logo",
    menu: "Menu",
    markets: "Markets",
    addItem: "Add an item",
    addMarket: "Add a market",
    anotherTag: "Another tag",
    name: "Name",
    about: "About",
    phone: "Phone",
    email: "Email",
    website: "Website",
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    terms: "Terms",
    item: "Item",
    price: "Price CAD",
    season: "Season",
    descriptionField: "Description",
    dietary: "Dietary tags",
    stallLabel: "Stall label",
    findAMarket: "Find a market",
  },

  "/market": {
    title: "Market Portal",
    description: "Create an account to update the {brand} market you run.",
    h1: "Market Portal",
    lede: "Create an account with the email you use for the organization, or sign in if you already have one. A Gmail address is fine. Ask only if you run the market, or the organization has asked you to. After we assign it, you can edit it here.",
    createAccount: "Create an account",
    signIn: "Sign in",
    how: "How this works",
    stepAccount: "Create an account using your organization email.",
    stepWait: "Wait for {brand}'s approval email.",
    stepEdit: "Edit the market page. Keep the hours and the stall list current.",
    unavailable: "The market editor is not available yet. Try again in a minute.",
    ledeHasListings:
      "Update the hours, contact details, and the stalls. Changes show on the public page. Keep the hours and the stall list current.",
    published: "Published",
    draft: "Draft",
  },

  "/market/[id]": {
    title: "Edit your market",
    description: "Update a {brand} market you run.",
    unavailableTitle: "Your market",
    unavailable: "The market editor is not available yet. Try again in a minute.",
    published: "Published.",
    viewPublic: "View the public page",
    draft: "Draft. This market is not on the public site yet.",
    profile: "Profile",
    logo: "Logo",
    hours: "Hours",
    stalls: "Stalls",
    addListed: "Add a stall already listed",
    addUnlisted: "Add a stall that is not listed yet",
    anotherTag: "Another tag",
    name: "Name",
    about: "About",
    phone: "Phone",
    email: "Email",
    website: "Website",
    instagram: "Instagram",
    tiktok: "TikTok",
    facebook: "Facebook",
    day: "Day",
    opens: "Opens",
    closes: "Closes",
    seasonStart: "Season start",
    seasonEnd: "Season end",
    visitorNote: "Note for visitors",
    stallLabel: "Stall label",
    findAStall: "Find a stall",
  },

  "/terms": {
    title: "Terms",
    description: "Terms for using {brand}, the Toronto farmers' market directory.",
    h1: "Terms",
    lede: "Using {brand} means you agree to these terms. Current as of {effective}. Creating an account, with email and password or Continue with Google, is acceptance. Reading the directory without an account is still use of the site.",
    agreement: "The agreement",
    directory: "The directory",
    accounts: "Stall and market accounts",
    orders: "Orders",
    posts: "Posts and reviews",
    login: "Your login",
    location: "Location",
    acceptableUse: "Acceptable use",
    goesWrong: "If something goes wrong",
    ontarioLaw: "Ontario law",
    changes: "Changes",
    theRest: "The rest",
    contact: "Contact",
    privacyPolicy: "Privacy policy",
  },

  "/privacy": {
    title: "Privacy",
    description: "How {brand} collects, uses, and deletes personal information.",
    h1: "Privacy",
    lede: "{entity} operates {brand}. This policy is current as of {effective}.",
    who: "Who we are",
    why: "Why we use it",
    collect: "What we collect",
    cookies: "Cookies, storage, and analytics",
    mail: "Mail",
    whoElse: "Who else sees it",
    keeping: "Keeping it, changing it, deleting it",
    breach: "A breach",
    children: "Children",
    rights: "Your rights",
    changes: "Changes",
  },

  "/not-found": {
    title: "Not found",
    h1: "This market or vendor isn't here",
    lede: "The page may have moved. Search for the name, or browse the directory.",
    markets: "Markets",
    vendors: "Vendors",
    browse: "Browse markets",
  },

  "/error": {
    h1: "Something stuck",
    lede: "Try that page again. The directory is still here.",
    tryAgain: "Try again",
  },
} as const;

type CopyValues = Record<string, string | number>;

/** Fills {brand}, {city}, {region}, {tagline}, and any other {placeholder} you pass. */
export function copyText(template: string, values: CopyValues = {}) {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (token, key: string) => {
    if (Object.prototype.hasOwnProperty.call(values, key) && values[key] != null) {
      return String(values[key]);
    }
    if (key === "brand") return SITE_NAME;
    if (key === "city") return LAUNCH_CITY;
    if (key === "region") return LAUNCH_REGION;
    if (key === "coverage") return LAUNCH_COVERAGE;
    if (key === "tagline") return siteCopy["every page"].tagline;
    return token;
  });
}

export const SITE_TAGLINE = siteCopy["every page"].tagline;
export const SITE_TITLE = copyText(siteCopy["every page"].documentTitle);
export const SEARCH_PLACEHOLDER = copyText(siteCopy["every page"].searchPlaceholder);
export const HEADER_SEARCH_PLACEHOLDER = SEARCH_PLACEHOLDER;
export const HEADER_SEARCH_PLACEHOLDER_SHORT = siteCopy["every page"].searchPlaceholderShort;
export const SEARCH_LABEL = siteCopy["every page"].searchLabel;
export const PRODUCT_SEARCH_PLACEHOLDER = siteCopy["/products"].searchPlaceholder;
export const PRODUCT_SEARCH_LABEL = siteCopy["/products"].searchLabel;
