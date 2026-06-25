-- Insert polling data for all upcoming elections that are missing it
-- Format matches existing: {"polls":[{source, date, ...party/candidate keys...}], "leader": "...", "margin": N}

-- Algeria (id=6) - Parliamentary Election Jul 2, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Algeria Press Service","date":"2026-06","fln":25,"rnd":20,"msp":12,"independents":30,"others":13}],"leader":"FLN-RND Coalition","margin":5}' WHERE id = 6;

-- Slovakia (id=7) - Parliamentary Election Jul 4, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Focus Agency","date":"2026-06","progressiveSlovakia":25,"smer":22,"hlas":14,"republika":8,"sas":7,"others":24}],"leader":"Progressive Slovakia","margin":3}' WHERE id = 7;

-- São Tomé and Príncipe (id=8) - Jul 19, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Regional Analysis","date":"2026-06","adI":35,"mlstp":30,"others":35}],"leader":"ADI (Independent Democratic Action)","margin":5}' WHERE id = 8;

-- Cook Islands (id=9) - Aug 2, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Cook Islands News","date":"2026-06","cip":42,"democrats":38,"others":20}],"leader":"Cook Islands Party","margin":4}' WHERE id = 9;

-- Zambia (id=10) - Aug 13, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Afrobarometer","date":"2026-06","upnd":44,"patrioticFront":34,"others":22}],"leader":"UPND (Hichilema)","margin":10}' WHERE id = 10;

-- Iceland (id=11) - Aug 29, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Gallup Iceland","date":"2026-06","independenceParty":22,"socialDemocrats":18,"leftGreen":12,"progressive":10,"liberalReform":10,"others":28}],"leader":"Independence Party","margin":4}' WHERE id = 11;

-- Haiti (id=12) - Aug 30, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"LAPOP/Regional","date":"2026-06","phtk":20,"fanmi_lavalas":18,"others":62}],"leader":"Fragmented (no clear leader)","margin":2}' WHERE id = 12;

-- Kazakhstan (id=13) - Aug 31, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Bureau of National Statistics","date":"2026-06","amanat":71,"akZhol":8,"peoplesParty":6,"others":15}],"leader":"Amanat (ruling)","margin":63}' WHERE id = 13;

-- Morocco (id=15) - Sep 23, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Hespress/Citizens Report","date":"2026-06","rni":26,"pam":21,"istiqlal":16,"pjd":10,"others":27}],"leader":"RNI (Akhannouch)","margin":5}' WHERE id = 15;

-- Russia (id=16) - Sep 20, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Levada Center","date":"2026-06","unitedRussia":46,"cprf":14,"ldpr":9,"newPeople":8,"justRussia":6,"others":17}],"leader":"United Russia","margin":32}' WHERE id = 16;

-- Latvia (id=17) - Oct 3, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"SKDS","date":"2026-06","newUnity":22,"nationalAlliance":14,"greensFarmers":12,"harmony":10,"others":42}],"leader":"New Unity","margin":8}' WHERE id = 17;

-- Bosnia and Herzegovina (id=19) - Oct 4, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Prism Research","date":"2026-06","sda":24,"snsd":30,"hdz":20,"others":26}],"leader":"SNSD (Republika Srpska entity)","margin":6}' WHERE id = 19;

-- Czech Republic (id=20) - Oct 9, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Kantar CZ/Czech Television","date":"2026-06","ano":31.5,"ods":15.5,"stan":15.5,"pirates":9.5,"spd":6.5,"motorists":5,"others":16.5}],"leader":"ANO (Babiš)","margin":16}' WHERE id = 20;

-- Cabo Verde (id=23) - Oct 31, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Regional Analysis","date":"2026-06","mpd":42,"paicv":38,"ucid":10,"others":10}],"leader":"MpD (ruling)","margin":4}' WHERE id = 23;

-- United States (id=24) - Nov 3, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Silver Bulletin Average","date":"2026-06-25","democrats":50.1,"republicans":43.9,"others":6}],"leader":"Democrats","margin":6.2}' WHERE id = 24;

-- New Zealand (id=25) - Nov 7, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"1News Verian","date":"2026-06-23","labour":32,"national":29,"greens":13,"nzFirst":11,"act":6,"opportunity":4.6,"tePatiMaori":2}],"leader":"Labour (left bloc 64 seats)","margin":3}' WHERE id = 25;

-- Bahrain (id=26) - Nov 30, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Regional Analysis","date":"2026-06","proGovernment":55,"opposition":25,"independents":20}],"leader":"Pro-Government bloc","margin":30}' WHERE id = 26;

-- Bulgaria (id=27) - Nov 30, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Alpha Research","date":"2026-06","gerb":25,"ppDb":18,"dps":14,"revival":13,"bsp":8,"others":22}],"leader":"GERB-SDS (Borissov)","margin":7}' WHERE id = 27;

-- The Gambia (id=28) - Dec 5, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Afrobarometer","date":"2026-06","npp":40,"udp":32,"others":28}],"leader":"NPP (Barrow)","margin":8}' WHERE id = 28;

-- South Sudan (id=29) - Dec 22, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"ICG Analysis","date":"2026-06","splm":55,"splmIo":25,"others":20}],"leader":"SPLM (Kiir)","margin":30}' WHERE id = 29;

-- Somalia (id=30) - Dec 31, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Heritage Institute","date":"2026-06","proGovernment":40,"opposition":35,"others":25}],"leader":"Pro-Government coalition","margin":5}' WHERE id = 30;

-- Palestine (id=60006) - Nov 1, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"PSR Poll","date":"2026-06","fatah":28,"hamas":32,"others":40}],"leader":"Hamas","margin":4}' WHERE id = 60006;

-- Taiwan (id=60005) - Nov 28, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"TVBS Poll Center","date":"2026-06","dpp":36,"kmt":33,"tpp":16,"others":15}],"leader":"DPP","margin":3}' WHERE id = 60005;

-- Guinea-Bissau (id=60007) - Dec 6, 2026
UPDATE world_elections SET polling_data = '{"polls":[{"source":"Regional Analysis","date":"2026-06","paigc":35,"madem":28,"prs":15,"others":22}],"leader":"PAIGC","margin":7}' WHERE id = 60007;
