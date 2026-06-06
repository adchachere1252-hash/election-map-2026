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
  // OH Senate (Round 6) — Jon Husted (appointed R incumbent)
  "jon husted":           `${BASE}/jon-husted_b39430c8.jpg`,
  // WV Senate (Round 6) — Jim Justice (R incumbent)
  "jim justice":          `${BASE}/jim-justice_9559bc9b.jpg`,
  // Governor photo audit (Round 7) — missing Governor candidates
  // Roy Cooper: bioguide C000760 returns 404 (never served in Congress), using CDN
  "roy cooper":           `${BASE}/roy-cooper_be49f249.jpg`,
  "ned lamont":           `${BASE}/ned-lamont_24e0ecdd.jpg`,
  "joe lombardo":         `${BASE}/joe-lombardo_fb7e8617.jpg`,
  "larry rhoden":         `${BASE}/larry-rhoden_1ce6b32f.jpg`,
  // House General candidates (Round 8 — competitive races)
  "eric flores":           `${BASE}/eric-flores_e5208d5e.jpg`,
  "denise powell":         `${BASE}/denise-powell_d3928462.jpg`,
  "brinker harding":       `${BASE}/brinker-harding_690af229.jpg`,
  "barb regnitz":          `${BASE}/barb-regnitz_ce484ef4.jpg`,
  "kevin siembida":        `${BASE}/kevin-siembida_0f4e659b.jpg`,
  "jamie ager":            `${BASE}/jamie-ager_025de85b.jpg`,
  "bobby pulido":          `${BASE}/bobby-pulido_116cdf80.jpg`,
  // Louisiana Senate runoff candidates (May 2026)
  "julia letlow":          `${BASE}/julia-letlow_42d7ee9c.jpg`,
  "john fleming":          `${BASE}/john-fleming_363529aa.jpg`,
  "jamie davis":           `${BASE}/jamie_davis_la_867d6b8d.jpg`,  // LA D Senate runoff candidate
  "gary crockett":         `${BASE}/gary_crockett_dee51265.jpg`,   // LA D Senate runoff candidate
  // June 2 2026 primary nominees (added June 3 2026)
  "alani bankhead":        `${BASE}/alani_bankhead_64fa939f.jpg`,           // MT-D Senate nominee
  "justin murphy":         `${BASE}/justin_murphy_b4a44b43.jpg`,           // NJ-R Senate nominee
  // NJ-12 general election candidates
  "adam hamawy":           `${BASE}/adam_hamawy_1769a586.jpg`,             // NJ-12 D nominee (NYT portrait)
  "greg mele":             `${BASE}/greg_mele_350691f2.jpg`,               // NJ-12 R nominee (NJ Globe)
  // CA D vs D races — CA-11 and CA-12
  "scott wiener":          `${BASE}/scott_wiener_61873c20.jpg`,            // CA-11 D (CA State Senator)
  "connie chan":           `${BASE}/connie_chan_11dcae1f.jpg`,             // CA-11 D (SF Supervisor)
  "jamie joyce":           `${BASE}/jamie_joyce_e5b8b63a.jpg`,            // CA-12 D
  // June 3 2026 — full photo audit batch
  "mike mcguire":          `${BASE}/mike_mcguire_b4d06a7e.jpg`,           // CA-1 D (CA State Senator)
  "james gallagher":       `${BASE}/james_gallagher_0e653239.jpg`,        // CA-1 R (CA Assembly Speaker)
  "kevin lincoln":         `${BASE}/kevin_lincoln_0994a1ab.jpg`,          // CA-13 R (Stockton Mayor)
  "larry thompson":        `${BASE}/larry_thompson_5197132c.jpg`,         // CA-32 R
  "joe mitchell":          `${BASE}/joe_mitchell_643e31b1.jpg`,           // IA-2 R
  "sarah trone garriott":  `${BASE}/sarah_trone_garriott_0f2f52c7.jpg`,  // IA-3 D
  "dave dawson":           `${BASE}/dave_dawson_a73bfbbc.jpg`,            // IA-4 D
  "chris mcgowan":         `${BASE}/chris_mcgowan_5eebb45c.jpg`,          // IA-4 R
  "sam forstag":           `${BASE}/sam_forstag_8a25a32b.jpg`,            // MT-1 D
  "aaron flint":           `${BASE}/aaron_flint_d5400e39.jpg`,            // MT-1 R
  "deb haaland":           `${BASE}/deb_haaland_70d42c34.jpg`,            // NM Governor D
  "gregg hull":            `${BASE}/gregg_hull_52308593.jpg`,             // NM Governor R
  "zach lahn":             `${BASE}/zach_lahn_a30bee0e.jpg`,              // IA Governor R
  // June 3 batch 2 — full verification additions
  "dan ahlers":            `${BASE}/dan_ahlers_808ef1bf.jpg`,             // SD Governor D
  "brian miller":          `${BASE}/brian_miller_90583729.jpg`,           // MT-2 D
  "zack mullock":          `${BASE}/zack_mullock_17ebd1af.jpg`,           // NJ-2 D
  "michael mcguire":       `${BASE}/michael_mcguire_nj3_a7d50bd9.jpg`,   // NJ-3 R
  "rachel peace":          `${BASE}/rachel_peace_a7d6f6d5.jpg`,           // NJ-4 D
  "sean kirrane":          `${BASE}/sean_kirrane_bebbda68.jpg`,           // NJ-5 R
  "hillary herzig":        `${BASE}/hillary_herzig_048abfb2.jpg`,         // NJ-6 R
  "rosie pino":            `${BASE}/rosie_pino_233de605.jpg`,             // NJ-9 R
  "carmen bucco":          `${BASE}/carmen_bucco_3e3f9d95.jpg`,           // NJ-10 R
  "damon galdo":           `${BASE}/damon_galdo_6d559bce.jpg`,            // NJ-1 R
  // CA-40 incumbent fix — Ken Calvert (bioguide C000059)
  "ken calvert":           `https://unitedstates.github.io/images/congress/225x275/C000059.jpg`,
  // CA-14 D vs D general election candidates (June 4 2026)
  "aisha wahab":           `${BASE}/aisha_wahab_a9faf4ce.jpg`,              // CA-14 D (CA State Senator SD-10)
  "melissa hernandez":     `${BASE}/melissa_hernandez_0309c12d.jpg`,        // CA-14 D (challenger)
  // CA photo audit completions (June 4 2026)
  "sam liccardo":          `${BASE}/sam_liccardo_e0db628c.jpg`,            // CA-16 D (former San Jose Mayor)
  "gil cisneros":          `${BASE}/gil_cisneros_e29e0c3b.jpg`,            // CA-31 D (returning challenger)
  "marni von wilpert":     `${BASE}/marni_von_wilpert_c2df38d6.jpg`,       // CA-48 D
  // CA Governor candidates (June 5 2026 — DDHQ projection)
  "xavier becerra":        `${BASE}/xavier_becerra_d2b12c57.jpg`,          // CA Gov D (fmr HHS Secretary)
  "steve hilton":          `${BASE}/steve_hilton_dc6ad31b.jpg`,            // CA Gov R (fmr Fox News host)
  "kevin kiley":           `${BASE}/kevin_kiley_5f0c3d28.jpg`,             // CA-6 I (bioguide portrait)
  // CA House candidates (June 6 2026 — Friday ballot drop update)
  "richard pan":           `${BASE}/richard_pan_fafb55ad.jpg`,             // CA-6 D (fmr state senator)
  "mai vang":              `${BASE}/mai_vang_ed78789a.jpg`,               // CA-7 D (Sacramento City Council)
  "randy villegas":        `${BASE}/randy_villegas_e1035444.jpg`,         // CA-22 D (Visalia school board)

  // CA House candidates (June 6 2026 — 8-district fix batch)
  "robb tucker":            `${BASE}/robb_tucker_7873c0dd.jpg`,             // CA-3 R (Placer County Supervisor)
  "kyle kirkland":          `${BASE}/kyle_kirkland_6ea5e784.jpg`,           // CA-21 R (business leader)
  "jacqui irwin":           `${BASE}/jacqui_irwin_82b58144.jpg`,            // CA-26 D (CA Assemblywoman)
  "sam gallucci":           `${BASE}/sam_gallucci_e81fb820.jpg`,            // CA-26 R (businessman)
  "jason gibbs":            `${BASE}/jason_gibbs_40a4aad5.jpg`,             // CA-27 R (Santa Clarita Mayor)
  "angela gonzales-torres": `${BASE}/angela_gonzales_torres_69628858.jpg`,  // CA-34 D (Justice Democrats)
  "hilda solis":            `${BASE}/hilda_solis_669cb34d.jpg`,             // CA-38 D (fmr Labor Sec/LA County Supervisor)
  "pedro casas":            `${BASE}/pedro_casas_f79cf321.jpg`,             // CA-38 R (Army veteran)
  "mitch clemmons":         `${BASE}/mitch_clemmons_8f836571.jpg`,          // CA-41 R (businessman)
  "chuong vo":              `${BASE}/chuong_vo_ed3ee136.jpg`,               // CA-45 R (fmr Mayor of Fountain Valley)
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
