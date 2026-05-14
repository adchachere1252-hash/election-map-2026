/**
 * CDN URLs for candidate headshots used in Key Races section.
 * Sources: Congress.gov official bioguide photos (public domain) and Wikipedia (CC BY-SA).
 * Keyed by candidate name (lowercase, normalized).
 */

const BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";

export const CANDIDATE_PHOTOS: Record<string, string> = {
  // Senate incumbents
  "jon ossoff":           `${BASE}/jon-ossoff_2eafec1f.jpg`,
  // gary peters — REMOVED: retiring, not running in 2026
  "john hickenlooper":    `${BASE}/john-hickenlooper_890f9235.jpg`,
  // dick durbin — REMOVED: retiring, not running in 2026
  "tina smith":           `${BASE}/tina-smith_853cdf1a.jpg`,
  "jeanne shaheen":       `${BASE}/jeanne-shaheen_9a7397d7.jpg`,
  "cory booker":          `${BASE}/cory-booker_2545ffe9.jpg`,
  "ben ray luján":        `${BASE}/ben-ray-lujan_430c3fec.jpg`,
  "ben ray lujan":        `${BASE}/ben-ray-lujan_430c3fec.jpg`,
  // IL Senate candidates
  "juliana stratton":     `${BASE}/juliana-stratton_a6b800ae.jpg`,
  // House incumbents
  "david schweikert":     `${BASE}/david-schweikert_c1fa812e.jpg`,
  "adam gray":            `${BASE}/adam-gray_79bd8b30.jpg`,
  "gabe evans":           `${BASE}/gabe-evans_ba2df679.jpg`,
  "zach nunn":            `${BASE}/zach-nunn_eac8970b.jpg`,
  "tom suozzi":           `${BASE}/tom-suozzi_0c4eae93.jpg`,
  "john w. mannion":      `${BASE}/john-mannion_bdcaf070.jpg`,
  "john mannion":         `${BASE}/john-mannion_bdcaf070.jpg`,
  "don davis":            `${BASE}/don-davis_e33de8a9.jpg`,
  "janelle s. bynum":     `${BASE}/janelle-bynum_6eacebec.jpg`,
  "janelle bynum":        `${BASE}/janelle-bynum_6eacebec.jpg`,
  "henry cuellar":        `${BASE}/henry-cuellar_758f6022.jpg`,
  "eugene vindman":       `${BASE}/eugene-vindman_6868eaf7.jpg`,
  "nicholas j. begich":   `${BASE}/nicholas-begich_eb851933.jpg`,
  "nicholas begich":      `${BASE}/nicholas-begich_eb851933.jpg`,
  "elijah crane":         `${BASE}/elijah-crane_0100ed41.jpg`,
  // NC-1 challenger
  "laurie buckhout":      `${BASE}/laurie-buckhout_18f4c9b7.jpg`,
  // Senate challengers / non-Congress candidates (Round 2)
  "don tracy":            `${BASE}/don-tracy_3770cfc3.jpg`,
  "earl carter":          `${BASE}/earl-carter_cba92698.jpg`,
  // michael whatley updated below in Round 3 with better portrait
  "ron kincaid":          `${BASE}/ron-kincaid_7bc5aec9.jpg`,
  "graham platner":       `${BASE}/graham-platner_b9a8fdd2.jpg`,
  "cindy burbank":        `${BASE}/cindy-burbank_7a45530c.jpg`,
  "james talarico":       `${BASE}/james-talarico_80ead04e.jpg`,
  "john cornyn":          `${BASE}/john-cornyn_6230288e.jpg`,
  "charles booker":       `${BASE}/charles-booker_c7f21579.jpg`,
  "scott colom":          `${BASE}/scott-colom_77c97e30.jpg`,
  "rachel fetty anderson":`${BASE}/rachel-fetty-anderson_de7b83b6.jpg`,
  "james w. byrd":        `${BASE}/james-byrd_491067c8.jpg`,
  "james byrd":           `${BASE}/james-byrd_491067c8.jpg`,
  "hallie shoffner":      `${BASE}/hallie-shoffner_7fbd32e9.jpg`,
  "dakarai larriett":     `${BASE}/dakarai-larriett_eb9a26e2.jpg`,
  // Governor candidates (Round 3 — confirmed running in 2026)
  "wes moore":            `${BASE}/wes-moore_181f290a.jpg`,
  "kathy hochul":         `${BASE}/kathy-hochul_ad50280c.jpg`,
  "darren bailey":        `${BASE}/darren-bailey_a50797b3.jpg`,
  "rob sand":             `${BASE}/rob-sand_f46705e4.jpg`,
  "j.b. pritzker":        `${BASE}/jb-pritzker_bd87f5a7.jpg`,
  "jb pritzker":          `${BASE}/jb-pritzker_bd87f5a7.jpg`,
  "amy klobuchar":        `${BASE}/amy-klobuchar_4167e3f7.jpg`,
  // House competitive candidates (Round 3)
  "frank mrvan":          `${BASE}/frank-mrvan_edfce460.jpg`,
  "maggie goodlander":    `${BASE}/maggie-goodlander_031a7473.jpg`,
  "ammar campa-najjar":   `${BASE}/ammar-campa-najjar_97ded915.jpg`,
  "jim desmond":          `${BASE}/jim-desmond_8cace2ee.jpg`,
  "tano tijerina":        `${BASE}/tano-tijerina_a5173754.jpg`,
  // OH-9: Derek Merrin won primary (Josh Williams lost), faces Marcy Kaptur
  "derek merrin":         `${BASE}/derek-merrin_431549e8.jpg`,
  // Michael Whatley updated portrait (replaces old side-by-side crop)
  "michael whatley":      `${BASE}/michael-whatley_b5138cff.jpg`,
  // Governor candidates (Round 4 — incumbents + new challengers)
  "maura healey":         `${BASE}/maura-healey_38185e14.jpg`,
  "josh shapiro":         `${BASE}/josh-shapiro_4af6b942.jpg`,
  "katie hobbs":          `${BASE}/katie-hobbs_e47db872.jpg`,
  "amy acton":            `${BASE}/amy-acton_45ab5be5.jpg`,
  "vivek ramaswamy":      `${BASE}/vivek-ramaswamy_7c611a5f.jpg`,
  "kelly ayotte":         `${BASE}/kelly-ayotte_97b4f521.jpg`,
  "gina hinojosa":        `${BASE}/gina-hinojosa_cc08c1e9.jpg`,
  "lynne walz":           `${BASE}/lynne-walz_85f391cd.jpg`,
  "brad little":          `${BASE}/brad-little_bac763f9.jpg`,
  "daniel mckee":         `${BASE}/daniel-mckee_6a589d0b.jpg`,
  "tina kotek":           `${BASE}/tina-kotek_dc80abcd.jpg`,
  "josh green":           `${BASE}/josh-green_c33a5362.jpg`,
  // AR Governor (Round 5)
  "sarah huckabee sanders": `${BASE}/sarah-huckabee-sanders_916e3316.jpg`,
  // TX Governor (Round 5)
  "greg abbott":          `${BASE}/greg-abbott_a1c32b47.jpg`,
};

export const PARTY_LOGOS = {
  D: `${BASE}/party-dem_659a330d.svg`,
  R: `${BASE}/party-rep_e24344e9.svg`,
};

/**
 * Look up a candidate photo URL by name (case-insensitive).
 */
export function getCandidatePhoto(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return CANDIDATE_PHOTOS[key] ?? null;
}
