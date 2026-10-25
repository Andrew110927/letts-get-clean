// Everything brand-specific for the owner app lives in this file.
// To run the app for another detailing business: change the values below, swap the icons in icons/,
// and point `supabase` at that business's project (same tables, see supabase/migrations/).
window.APP_CONFIG = {
  brand: {
    name: "Letts Get Clean",
    appName: "LGC Pro",
    owner: "Andrew",
    tagline: "Mobile car detailing · Orange County, NY",
    // Applied as CSS variables at startup, so a new palette needs no CSS edits.
    colors: {
      bg: "#07080B", panel: "#12151B", panel2: "#181C24", line: "#262C36", line2: "#323A46",
      fg: "#F4F5F7", dim: "#A7AEB8", mute: "#6E7682",
      accent: "#29C8FF", accentInk: "#04131A",
      ok: "#4ADE80", warn: "#FBBF24", bad: "#F87171"
    }
  },

  site: {
    url: "https://andrew110927.github.io/letts-get-clean/",
    reviewUrl: "https://andrew110927.github.io/letts-get-clean/#review"
  },

  // Publishable key: safe in client code. Row-level security only lets a confirmed owner account read customer data.
  supabase: {
    url: "https://fisenrazdvnobzjpihti.supabase.co",
    key: "sb_publishable_mSuKlYGK-2I2aVj4IaFVoQ_2Jm7b0th"
  },

  payments: {
    methods: ["Cash", "Cash App", "Venmo", "Card", "Other"],
    line: "Cash, Cash App ($AndrewLetta) or Venmo (@Andrew-Letts-9)"
  },

  social: {
    // k matches the socials keys in the website settings; open is where "post it" sends you (opens the app on phones).
    platforms: [
      { k: "instagram", label: "Instagram", open: "https://www.instagram.com/" },
      { k: "tiktok", label: "TikTok", open: "https://www.tiktok.com/upload" },
      { k: "facebook", label: "Facebook", open: "https://www.facebook.com/" },
      { k: "google", label: "Google", open: "https://business.google.com/" }
    ],
    scheduler: { label: "Metricool", url: "https://app.metricool.com/" },
    hashtags: "#lettsgetclean #cardetailing #mobiledetailing #orangecountyny #newburghny #hudsonvalley #autodetailing #cleancar",
    tips: [
      "Wash from the top down and save the wheels for last, so brake dust never touches your paint.",
      "Park in the shade before washing. Sun dries soap into spots before you can rinse it.",
      "Shake out floor mats every week. Grit ground into carpet is what wears it thin.",
      "Bird droppings and bug guts eat into clear coat fast. Wipe them off within a day or two.",
      "Use a separate microfiber for glass. Towels with wax on them leave streaks.",
      "A coat of wax before winter makes road salt slide off instead of sticking."
    ]
  },

  // Text messages the app pre-fills. Placeholders: {first} {day} {time} {package} {total} {where} {prep}
  // {owner} {brand} {phone} {site} {review} {pay}. Edit freely; unknown placeholders are left as typed.
  messages: {
    confirm: "Hi {first}, it's {owner} from {brand}. You're confirmed for {day} at {time}: {package}, {total}. {prep} Pay after the job: {pay}. See you then!",
    prepMobile: "Please have an outdoor outlet and a hose spigot ready near the car.",
    prepDropoff: "Drop-off is at my place in Newburgh. I'll text you the address.",
    onMyWay: "Hi {first}, {owner} from {brand} here. I'm on my way and will see you in about 15 minutes.",
    running: "Hi {first}, {owner} from {brand}. I'm running about 15 minutes behind, sorry about that! See you soon.",
    thanks: "Thanks for choosing {brand}, {first}! If you have a minute, a quick review helps my small business a lot: {review}",
    rebook: "Hi {first}, it's {owner} from {brand}. It's been a little while since your last detail. Want me to get you on the schedule? Pick a time here: {site}",
    decline: "Hi {first}, it's {owner} from {brand}. Sorry, I can't make {day} at {time} work. Could another time work for you? Open times are here: {site}"
  },

  // Used only if the live settings can't load. The website has the same defaults.
  defaults: {
    phone: "(845) 282-9387",
    dealEnds: "2026-11-16",
    startDate: "2026-10-24",
    slotsWeekday: ["15:00", "17:00"],
    slotsWeekend: ["13:30", "17:30"],
    daysOff: [],
    packages: [
      { id: "exterior", name: "Exterior", deal: 25, regular: 35, items: ["Hand wash & dry", "Wheels cleaned & tires shined", "Bug & road grime removed", "Windows & mirrors streak-free"] },
      { id: "interior", name: "Interior", deal: 30, regular: 40, items: ["Vacuum seats, carpets & trunk", "Dash, console & door panels wiped", "Floor mats cleaned", "Cupholders & air vents detailed"] },
      { id: "full", name: "The Full Detail", deal: 50, regular: 70, items: ["Everything in Exterior + Interior", "Inside and out, one visit", "Biggest savings"] }
    ],
    sizes: [
      { id: "car", label: "Car / sedan", price: 0 },
      { id: "suv", label: "SUV / truck", price: 10 },
      { id: "van", label: "Minivan / 3-row", price: 15 }
    ],
    addons: [
      { id: "freshener", label: "Air freshener", price: 2 },
      { id: "heavy", label: "Extra-dirty interior", price: 10 },
      { id: "wax", label: "Wax coat upgrade", price: 20 }
    ],
    socials: { instagram: "https://www.instagram.com/lettsgetclean", tiktok: "https://www.tiktok.com/@lettsgetclean", facebook: "", google: "" }
  }
};
