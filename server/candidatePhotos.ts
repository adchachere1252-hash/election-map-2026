/**
 * CDN URLs for candidate headshots used in Key Races section.
 * Sources: Congress.gov official bioguide photos (public domain) and Wikipedia (CC BY-SA).
 * Keyed by candidate name (lowercase, normalized).
 */

const BASE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663521029713/Duqshn4D3kdv9jkbtBdj4X";

export const CANDIDATE_PHOTOS: Record<string, string> = {
  // Senate incumbents
  "jon ossoff":           `${BASE}/jon-ossoff_2eafec1f.jpg`,
  "gary peters":          `${BASE}/gary-peters_50e7899d.jpg`,
  "john hickenlooper":    `${BASE}/john-hickenlooper_890f9235.jpg`,
  "dick durbin":          `${BASE}/dick-durbin_05b3c956.jpg`,
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
