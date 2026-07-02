/**
 * CDN URLs for candidate headshots used in Key Races section.
 * Sources: Congress.gov official bioguide photos (public domain) and Wikipedia (CC BY-SA).
 * Keyed by candidate name (lowercase, normalized).
 */

export const CANDIDATE_PHOTOS: Record<string, string> = {
  // Senate incumbents
  "jon ossoff":           `/manus-storage/jon-ossoff_2eafec1f.jpg`,
  // gary peters — REMOVED: retiring, not running in 2026
  "john hickenlooper":    `/manus-storage/john-hickenlooper_890f9235.jpg`,
  // dick durbin — REMOVED: retiring, not running in 2026
  "tina smith":           `/manus-storage/tina-smith_853cdf1a.jpg`,
  "jeanne shaheen":       `/manus-storage/jeanne-shaheen_9a7397d7.jpg`,
  "cory booker":          `/manus-storage/cory-booker_2545ffe9.jpg`,
  "ben ray luján":        `/manus-storage/ben-ray-lujan_430c3fec.jpg`,
  "ben ray lujan":        `/manus-storage/ben-ray-lujan_430c3fec.jpg`,
  // IL Senate candidates
  "juliana stratton":     `/manus-storage/juliana-stratton_a6b800ae.jpg`,
  // House incumbents
  "david schweikert":     `/manus-storage/david-schweikert_c1fa812e.jpg`,
  "adam gray":            `/manus-storage/adam-gray_79bd8b30.jpg`,
  "gabe evans":           `/manus-storage/gabe-evans_ba2df679.jpg`,
  "zach nunn":            `/manus-storage/zach-nunn_eac8970b.jpg`,
  "tom suozzi":           `/manus-storage/tom-suozzi_0c4eae93.jpg`,
  "john w. mannion":      `/manus-storage/john-mannion_bdcaf070.jpg`,
  "john mannion":         `/manus-storage/john-mannion_bdcaf070.jpg`,
  "don davis":            `/manus-storage/don-davis_e33de8a9.jpg`,
  "janelle s. bynum":     `/manus-storage/janelle-bynum_6eacebec.jpg`,
  "janelle bynum":        `/manus-storage/janelle-bynum_6eacebec.jpg`,
  "henry cuellar":        `/manus-storage/henry-cuellar_758f6022.jpg`,
  "eugene vindman":       `/manus-storage/eugene-vindman_6868eaf7.jpg`,
  "nicholas j. begich":   `/manus-storage/nicholas-begich_eb851933.jpg`,
  "nicholas begich":      `/manus-storage/nicholas-begich_eb851933.jpg`,
  "elijah crane":         `/manus-storage/elijah-crane_0100ed41.jpg`,
  // NC-1 challenger
  "laurie buckhout":      `/manus-storage/laurie-buckhout_18f4c9b7.jpg`,
  // Senate challengers / non-Congress candidates (Round 2)
  "don tracy":            `/manus-storage/don-tracy_3770cfc3.jpg`,
  "earl carter":          `/manus-storage/earl-carter_cba92698.jpg`,
  // michael whatley updated below in Round 3 with better portrait
  "ron kincaid":          `/manus-storage/ron-kincaid_7bc5aec9.jpg`,
  "graham platner":       `/manus-storage/graham-platner_b9a8fdd2.jpg`,
  "cindy burbank":        `/manus-storage/cindy-burbank_7a45530c.jpg`,
  "james talarico":       `/manus-storage/james-talarico_80ead04e.jpg`,
  "john cornyn":          `/manus-storage/john-cornyn_6230288e.jpg`,
  "charles booker":       `/manus-storage/charles-booker_c7f21579.jpg`,
  "scott colom":          `/manus-storage/scott-colom_77c97e30.jpg`,
  "rachel fetty anderson":`/manus-storage/rachel-fetty-anderson_de7b83b6.jpg`,
  "james w. byrd":        `/manus-storage/james-byrd_491067c8.jpg`,
  "james byrd":           `/manus-storage/james-byrd_491067c8.jpg`,
  "hallie shoffner":      `/manus-storage/hallie-shoffner_7fbd32e9.jpg`,
  "dakarai larriett":     `/manus-storage/dakarai-larriett_eb9a26e2.jpg`,
  // Governor candidates (Round 3 — confirmed running in 2026)
  "wes moore":            `/manus-storage/wes-moore_181f290a.jpg`,
  "kathy hochul":         `/manus-storage/kathy-hochul_ad50280c.jpg`,
  "darren bailey":        `/manus-storage/darren-bailey_a50797b3.jpg`,
  "rob sand":             `/manus-storage/rob-sand_f46705e4.jpg`,
  "j.b. pritzker":        `/manus-storage/jb-pritzker_bd87f5a7.jpg`,
  "jb pritzker":          `/manus-storage/jb-pritzker_bd87f5a7.jpg`,
  "amy klobuchar":        `/manus-storage/amy-klobuchar_4167e3f7.jpg`,
  // House competitive candidates (Round 3)
  "frank mrvan":          `/manus-storage/frank-mrvan_edfce460.jpg`,
  "maggie goodlander":    `/manus-storage/maggie-goodlander_031a7473.jpg`,
  "ammar campa-najjar":   `/manus-storage/ammar-campa-najjar_97ded915.jpg`,
  "jim desmond":          `/manus-storage/jim-desmond_8cace2ee.jpg`,
  "tano tijerina":        `/manus-storage/tano-tijerina_a5173754.jpg`,
  // OH-9: Derek Merrin won primary (Josh Williams lost), faces Marcy Kaptur
  "derek merrin":         `/manus-storage/derek-merrin_431549e8.jpg`,
  // Michael Whatley updated portrait (replaces old side-by-side crop)
  "michael whatley":      `/manus-storage/michael-whatley_b5138cff.jpg`,
  // Governor candidates (Round 4 — incumbents + new challengers)
  "maura healey":         `/manus-storage/maura-healey_38185e14.jpg`,
  "josh shapiro":         `/manus-storage/josh-shapiro_4af6b942.jpg`,
  "katie hobbs":          `/manus-storage/katie-hobbs_e47db872.jpg`,
  "amy acton":            `/manus-storage/amy-acton_45ab5be5.jpg`,
  "vivek ramaswamy":      `/manus-storage/vivek-ramaswamy_7c611a5f.jpg`,
  "kelly ayotte":         `/manus-storage/kelly-ayotte_97b4f521.jpg`,
  "gina hinojosa":        `/manus-storage/gina-hinojosa_cc08c1e9.jpg`,
  "lynne walz":           `/manus-storage/lynne-walz_85f391cd.jpg`,
  "brad little":          `/manus-storage/brad-little_bac763f9.jpg`,
  "daniel mckee":         `/manus-storage/daniel-mckee_6a589d0b.jpg`,
  "tina kotek":           `/manus-storage/tina-kotek_dc80abcd.jpg`,
  "josh green":           `/manus-storage/josh-green_c33a5362.jpg`,
  // AR Governor (Round 5)
  "sarah huckabee sanders": `/manus-storage/sarah-huckabee-sanders_916e3316.jpg`,
  // TX Governor (Round 5)
  "greg abbott":          `/manus-storage/greg-abbott_a1c32b47.jpg`,
  // OH Senate (Round 6) — Jon Husted (appointed R incumbent)
  "jon husted":           `/manus-storage/jon-husted_b39430c8.jpg`,
  // WV Senate (Round 6) — Jim Justice (R incumbent)
  "jim justice":          `/manus-storage/jim-justice_9559bc9b.jpg`,
  // Governor photo audit (Round 7) — missing Governor candidates
  // Roy Cooper: bioguide C000760 returns 404 (never served in Congress), using CDN
  "roy cooper":           `/manus-storage/roy-cooper_be49f249.jpg`,
  "ned lamont":           `/manus-storage/ned-lamont_24e0ecdd.jpg`,
  "joe lombardo":         `/manus-storage/joe-lombardo_fb7e8617.jpg`,
  "larry rhoden":         `/manus-storage/larry-rhoden_1ce6b32f.jpg`,
  // House General candidates (Round 8 — competitive races)
  "eric flores":           `/manus-storage/eric-flores_e5208d5e.jpg`,
  "denise powell":         `/manus-storage/denise-powell_d3928462.jpg`,
  "brinker harding":       `/manus-storage/brinker-harding_690af229.jpg`,
  "barb regnitz":          `/manus-storage/barb-regnitz_ce484ef4.jpg`,
  "kevin siembida":        `/manus-storage/kevin-siembida_0f4e659b.jpg`,
  "jamie ager":            `/manus-storage/jamie-ager_025de85b.jpg`,
  "bobby pulido":          `/manus-storage/bobby-pulido_116cdf80.jpg`,
  // Louisiana Senate runoff candidates (May 2026)
  "julia letlow":          `/manus-storage/julia-letlow_42d7ee9c.jpg`,
  "john fleming":          `/manus-storage/john-fleming_363529aa.jpg`,
  "jamie davis":           `/manus-storage/jamie_davis_la_867d6b8d.jpg`,  // LA D Senate runoff candidate
  "gary crockett":         `/manus-storage/gary_crockett_dee51265.jpg`,   // LA D Senate runoff candidate
  // June 2 2026 primary nominees (added June 3 2026)
  "alani bankhead":        `/manus-storage/alani_bankhead_64fa939f.jpg`,           // MT-D Senate nominee
  "justin murphy":         `/manus-storage/justin_murphy_b4a44b43.jpg`,           // NJ-R Senate nominee
  // NJ-12 general election candidates
  "adam hamawy":           `/manus-storage/adam_hamawy_1769a586.jpg`,             // NJ-12 D nominee (NYT portrait)
  "greg mele":             `/manus-storage/greg_mele_350691f2.jpg`,               // NJ-12 R nominee (NJ Globe)
  // CA D vs D races — CA-11 and CA-12
  "scott wiener":          `/manus-storage/scott_wiener_61873c20.jpg`,            // CA-11 D (CA State Senator)
  "connie chan":           `/manus-storage/connie_chan_11dcae1f.jpg`,             // CA-11 D (SF Supervisor)
  "jamie joyce":           `/manus-storage/jamie_joyce_e5b8b63a.jpg`,            // CA-12 D
  // June 3 2026 — full photo audit batch
  "mike mcguire":          `/manus-storage/mike_mcguire_b4d06a7e.jpg`,           // CA-1 D (CA State Senator)
  "james gallagher":       `/manus-storage/james_gallagher_0e653239.jpg`,        // CA-1 R (CA Assembly Speaker)
  "kevin lincoln":         `/manus-storage/kevin_lincoln_0994a1ab.jpg`,          // CA-13 R (Stockton Mayor)
  "larry thompson":        `/manus-storage/larry_thompson_5197132c.jpg`,         // CA-32 R
  "joe mitchell":          `/manus-storage/joe_mitchell_643e31b1.jpg`,           // IA-2 R
  "sarah trone garriott":  `/manus-storage/sarah_trone_garriott_0f2f52c7.jpg`,  // IA-3 D
  "dave dawson":           `/manus-storage/dave_dawson_a73bfbbc.jpg`,            // IA-4 D
  "chris mcgowan":         `/manus-storage/chris_mcgowan_5eebb45c.jpg`,          // IA-4 R
  "sam forstag":           `/manus-storage/sam_forstag_8a25a32b.jpg`,            // MT-1 D
  "aaron flint":           `/manus-storage/aaron_flint_d5400e39.jpg`,            // MT-1 R
  "deb haaland":           `/manus-storage/deb_haaland_70d42c34.jpg`,            // NM Governor D
  "gregg hull":            `/manus-storage/gregg_hull_52308593.jpg`,             // NM Governor R
  "zach lahn":             `/manus-storage/zach_lahn_a30bee0e.jpg`,              // IA Governor R
  // June 3 batch 2 — full verification additions
  "dan ahlers":            `/manus-storage/dan_ahlers_808ef1bf.jpg`,             // SD Governor D
  "brian miller":          `/manus-storage/brian_miller_90583729.jpg`,           // MT-2 D
  "zack mullock":          `/manus-storage/zack_mullock_17ebd1af.jpg`,           // NJ-2 D
  "michael mcguire":       `/manus-storage/michael_mcguire_nj3_a7d50bd9.jpg`,   // NJ-3 R
  "rachel peace":          `/manus-storage/rachel_peace_a7d6f6d5.jpg`,           // NJ-4 D
  "sean kirrane":          `/manus-storage/sean_kirrane_bebbda68.jpg`,           // NJ-5 R
  "hillary herzig":        `/manus-storage/hillary_herzig_048abfb2.jpg`,         // NJ-6 R
  "rosie pino":            `/manus-storage/rosie_pino_233de605.jpg`,             // NJ-9 R
  "carmen bucco":          `/manus-storage/carmen_bucco_3e3f9d95.jpg`,           // NJ-10 R
  "damon galdo":           `/manus-storage/damon_galdo_6d559bce.jpg`,            // NJ-1 R
  // CA-40 incumbent fix — Ken Calvert (bioguide C000059)
  "ken calvert":           `https://unitedstates.github.io/images/congress/225x275/C000059.jpg`,
  // CA-14 D vs D general election candidates (June 4 2026)
  "aisha wahab":           `/manus-storage/aisha_wahab_a9faf4ce.jpg`,              // CA-14 D (CA State Senator SD-10)
  "melissa hernandez":     `/manus-storage/melissa_hernandez_0309c12d.jpg`,        // CA-14 D (challenger)
  // CA photo audit completions (June 4 2026)
  "sam liccardo":          `/manus-storage/sam_liccardo_e0db628c.jpg`,            // CA-16 D (former San Jose Mayor)
  "gil cisneros":          `/manus-storage/gil_cisneros_e29e0c3b.jpg`,            // CA-31 D (returning challenger)
  "marni von wilpert":     `/manus-storage/marni_von_wilpert_c2df38d6.jpg`,       // CA-48 D
  // CA Governor candidates (June 5 2026 — DDHQ projection)
  "xavier becerra":        `/manus-storage/xavier_becerra_2da8720c.jpg`,          // CA Gov D (fmr HHS Secretary)
  "steve hilton":          `/manus-storage/steve_hilton_dc6ad31b.jpg`,            // CA Gov R (fmr Fox News host)
  "kevin kiley":           `/manus-storage/kevin_kiley_5f0c3d28.jpg`,             // CA-6 I (bioguide portrait)
  // CA House candidates (June 6 2026 — Friday ballot drop update)
  "richard pan":           `/manus-storage/richard_pan_fafb55ad.jpg`,             // CA-6 D (fmr state senator)
  "mai vang":              `/manus-storage/mai_vang_ed78789a.jpg`,               // CA-7 D (Sacramento City Council)
  "randy villegas":        `/manus-storage/randy_villegas_e1035444.jpg`,         // CA-22 D (Visalia school board)

  // CA House candidates (June 6 2026 — 8-district fix batch)
  "robb tucker":            `/manus-storage/robb_tucker_7873c0dd.jpg`,             // CA-3 R (Placer County Supervisor)
  "kyle kirkland":          `/manus-storage/kyle_kirkland_6ea5e784.jpg`,           // CA-21 R (business leader)
  "jacqui irwin":           `/manus-storage/jacqui_irwin_82b58144.jpg`,            // CA-26 D (CA Assemblywoman)
  "sam gallucci":           `/manus-storage/sam_gallucci_e81fb820.jpg`,            // CA-26 R (businessman)
  "jason gibbs":            `/manus-storage/jason_gibbs_40a4aad5.jpg`,             // CA-27 R (Santa Clarita Mayor)
  "angela gonzales-torres": `/manus-storage/angela_gonzales_torres_69628858.jpg`,  // CA-34 D (Justice Democrats)
  "hilda solis":            `/manus-storage/hilda_solis_669cb34d.jpg`,             // CA-38 D (fmr Labor Sec/LA County Supervisor)
  "pedro casas":            `/manus-storage/pedro_casas_f79cf321.jpg`,             // CA-38 R (Army veteran)
  "mitch clemmons":         `/manus-storage/mitch_clemmons_8f836571.jpg`,          // CA-41 R (businessman)
  "chuong vo":              `/manus-storage/chuong_vo_ed3ee136.jpg`,               // CA-45 R (fmr Mayor of Fountain Valley)

  // NM & SD candidates (June 6 2026 — verification round 2)
  "ndidiamaka okpareke":    `/manus-storage/ndidiamaka_okpareke_1aa8335e.jpg`,  // NM-1 R (Ballotpedia)
  "greg cunningham":        `/manus-storage/greg_cunningham_0127643c.jpg`,     // NM-2 R (Ballotpedia)
  "martin ruben zamora":    `/manus-storage/martin_zamora_a2e1a9a3.jpg`,       // NM-3 R (Ballotpedia)
  "nicole gronli":          `/manus-storage/nicole_gronli_9108f631.jpg`,       // SD-AL D (Ballotpedia)

  // Round 37 — Called special election candidates + missing House photos (June 26 2026)
  "matt van epps":           `/manus-storage/matt_van_epps_1e22fd67.jpg`,       // TN-7 R (house.gov official)
  "jimmy patronis":          `/manus-storage/jimmy_patronis_9af71d8a.jpg`,      // FL-1 R (house.gov official)
  "randy fine":              `/manus-storage/randy_fine_9762365f.jpg`,           // FL-6 R (congress.gov)
  "james r. walkinshaw":     `/manus-storage/james_walkinshaw_f846871d.jpg`,    // VA-11 D (house.gov official)
  "james walkinshaw":        `/manus-storage/james_walkinshaw_f846871d.jpg`,    // VA-11 D (alias)
  "adelita s. grijalva":     `/manus-storage/adelita_grijalva_75765725.jpg`,    // AZ-7 D (house.gov official)
  "adelita grijalva":        `/manus-storage/adelita_grijalva_75765725.jpg`,    // AZ-7 D (alias)
  "aftyn behn":              `/manus-storage/aftyn_behn_dd788aad.jpg`,          // TN-7 D (Ballotpedia)
  "gay valimont":            `/manus-storage/gay_valimont_c26a8156.jpg`,        // FL-1 D (Ballotpedia)
  "josh weil":               `/manus-storage/josh_weil_efc19a96.jpg`,           // FL-6 D (Ballotpedia)
  "joshua weil":             `/manus-storage/josh_weil_efc19a96.jpg`,           // FL-6 D (alias)
  "daniel butierez":         `/manus-storage/daniel_butierez_9027eac7.jpg`,     // AZ-7 R (Ballotpedia)
  "arthur purves":           `/manus-storage/arthur_purves_c9aa41b6.jpg`,       // VA-11 R (Ballotpedia)
  "eugene douglass":         `/manus-storage/eugene_douglass_dc7c2086.jpg`,     // NC-2 R (Ballotpedia)
  "mike kennedy":            `/manus-storage/mike_kennedy_de9e233b.jpg`,        // UT-4 R (congress.gov)
  "lewis mizrahi":           `/manus-storage/mizrahi-placeholder_fd2814f1.png`, // NY-8 R (party letter placeholder — no public photo available)

  // Colorado Primary winners (July 1 2026)
  "melat kiros":              `/manus-storage/melat_kiros_co_primary_a5db2427.jpg`,           // CO-1 D (upset winner over DeGette)
  "mark baisley":             `/manus-storage/mark_baisley_co_primary_5560975e.jpg`,         // CO Senate R nominee
  "phil weiser":              `/manus-storage/phil_weiser_co_primary_75363862.jpg`,           // CO Governor D nominee
  "christy peterson":         `/manus-storage/christy_peterson_co_primary_20648eba.jpg`,     // CO-1 R
  "kelley dennison":          `/manus-storage/kelley_dennison_co_primary_af972911.jpg`,      // CO-2 R
  "kelley anne dennison":     `/manus-storage/kelley_dennison_co_primary_af972911.jpg`,      // CO-2 R (alias)
  "dane romero":              `/manus-storage/dane_romero_co_primary_3bbc2898.jpg`,           // CO-3 D
  "dwayne romero":            `/manus-storage/dane_romero_co_primary_3bbc2898.jpg`,           // CO-3 D (alias)
  "dwayne l. romero":         `/manus-storage/dane_romero_co_primary_3bbc2898.jpg`,           // CO-3 D (alias)
  "eileen laubacher":         `/manus-storage/eileen_laubacher_co_primary_d2b7b7e3.jpg`,     // CO-4 D
  "jessica killin":           `/manus-storage/jessica_killin_co_primary_dabe99be.jpg`,       // CO-5 D
  "jason clark":              `/manus-storage/jason_clark_co6_7ce5bc07.png`,               // CO-6 R (replacement after Tewahade withdrawal)
  "tim bennett":              `/manus-storage/tim_bennett_co_primary_839518d7.jpg`,           // CO-7 R
  "jeff crank":               `/manus-storage/jeff_crank_co_primary_d71ea808.jpg`,            // CO-5 R (incumbent)
  "manny rutinel":            `/manus-storage/manny_rutinel_co_primary_5a7f4e57.jpg`,        // CO-8 D

  // Additional missing candidates (July 1 2026 — photo audit)
  "scott bottoms":             `/manus-storage/scott_bottoms_8173762a.jpg`,          // CO Governor R
  "dan cox":                   `/manus-storage/dan_cox_327096e2.jpg`,                // MD Governor R
  "bruce blakeman":            `/manus-storage/bruce_blakeman_30439fb7.jpg`,         // NY Governor R
  "cyndi munson":              `/manus-storage/cyndi_munson_b11d44b3.jpg`,           // OK Governor D
  "t. shannon":                `/manus-storage/tw_shannon_d4a70d09.jpg`,             // OK Governor R
  "t.w. shannon":              `/manus-storage/tw_shannon_d4a70d09.jpg`,             // OK Governor R (alias)
  "tw shannon":                `/manus-storage/tw_shannon_d4a70d09.jpg`,             // OK Governor R (alias)
  "toby doeden":               `/manus-storage/toby_doeden_f912bfcc.jpg`,            // SD Governor R
  "everett wess":              `/manus-storage/everett_wess_f2ce4e6c.jpg`,           // AL Senate D
  "larry marker":              `/manus-storage/larry_marker_22eaf901.jpg`,           // NM Senate R
  "annie andrews":             `/manus-storage/annie_andrews_1cb42390.jpg`,          // SC Senate D
  // Backfilled bioguide 404 candidates (Round 40)
  "garlin gilchrist":            `/manus-storage/garlin-gilchrist_cee4210e.jpg`,       // MI Senate D
  "la shawn ford":               `/manus-storage/la-shawn-ford_b425684b.jpg`,          // IL House
  "la shawn k. ford":            `/manus-storage/la-shawn-ford_b425684b.jpg`,          // IL House (alias)
  "terri yarbrough green":       `/manus-storage/terri-yarbrough-green_0d23b43c.jpg`,  // AR-1 D
  "tom barrett":                 `/manus-storage/tom-barrett_9fe8fd35.jpg`,             // MI-7 R
};

export const PARTY_LOGOS = {
  D: `/manus-storage/party-dem_659a330d.svg`,
  R: `/manus-storage/party-rep_e24344e9.svg`,
};

/**
 * Look up a candidate photo URL by name (case-insensitive).
 */
export function getCandidatePhoto(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return CANDIDATE_PHOTOS[key] ?? null;
}
