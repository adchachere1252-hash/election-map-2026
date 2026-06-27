import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";

// Full country name lookup by ISO alpha-2 code
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan", AL: "Albania", DZ: "Algeria", AO: "Angola", AR: "Argentina",
  AM: "Armenia", AU: "Australia", AT: "Austria", AZ: "Azerbaijan", BS: "Bahamas",
  BH: "Bahrain", BD: "Bangladesh", BY: "Belarus", BE: "Belgium", BZ: "Belize",
  BJ: "Benin", BT: "Bhutan", BO: "Bolivia", BA: "Bosnia and Herzegovina",
  BW: "Botswana", BR: "Brazil", BN: "Brunei", BG: "Bulgaria", BF: "Burkina Faso",
  BI: "Burundi", KH: "Cambodia", CM: "Cameroon", CA: "Canada", CV: "Cape Verde",
  CF: "Central African Republic", TD: "Chad", CL: "Chile", CN: "China",
  CO: "Colombia", CG: "Congo", CD: "DR Congo", CK: "Cook Islands",
  CR: "Costa Rica", HR: "Croatia", CU: "Cuba", CY: "Cyprus", CZ: "Czech Republic",
  DK: "Denmark", DJ: "Djibouti", DO: "Dominican Republic", EC: "Ecuador",
  EG: "Egypt", SV: "El Salvador", GQ: "Equatorial Guinea", ER: "Eritrea",
  EE: "Estonia", ET: "Ethiopia", FJ: "Fiji", FI: "Finland", FR: "France",
  GA: "Gabon", GM: "Gambia", GE: "Georgia", DE: "Germany", GH: "Ghana",
  GR: "Greece", GL: "Greenland", GT: "Guatemala", GN: "Guinea", GW: "Guinea-Bissau",
  GY: "Guyana", HT: "Haiti", HN: "Honduras", HK: "Hong Kong", HU: "Hungary",
  IS: "Iceland", IN: "India", ID: "Indonesia", IR: "Iran", IQ: "Iraq",
  IE: "Ireland", IL: "Israel", IT: "Italy", CI: "Ivory Coast", JM: "Jamaica",
  JP: "Japan", JO: "Jordan", KZ: "Kazakhstan", KE: "Kenya", KP: "North Korea",
  KR: "South Korea", KW: "Kuwait", KG: "Kyrgyzstan", LA: "Laos", LV: "Latvia",
  LB: "Lebanon", LS: "Lesotho", LR: "Liberia", LY: "Libya", LT: "Lithuania",
  LU: "Luxembourg", MG: "Madagascar", MW: "Malawi", MY: "Malaysia", ML: "Mali",
  MR: "Mauritania", MX: "Mexico", MD: "Moldova", MN: "Mongolia", ME: "Montenegro",
  MA: "Morocco", MZ: "Mozambique", MM: "Myanmar", NA: "Namibia", NP: "Nepal",
  NL: "Netherlands", NC: "New Caledonia", NZ: "New Zealand", NI: "Nicaragua",
  NE: "Niger", NG: "Nigeria", NO: "Norway", OM: "Oman", PK: "Pakistan",
  PS: "Palestine", PA: "Panama", PG: "Papua New Guinea", PY: "Paraguay",
  PE: "Peru", PH: "Philippines", PL: "Poland", PT: "Portugal", PR: "Puerto Rico",
  QA: "Qatar", RO: "Romania", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia",
  SN: "Senegal", RS: "Serbia", SL: "Sierra Leone", SG: "Singapore", SK: "Slovakia",
  SI: "Slovenia", SB: "Solomon Islands", SO: "Somalia", ZA: "South Africa",
  SS: "South Sudan", ES: "Spain", LK: "Sri Lanka", SD: "Sudan", SR: "Suriname",
  SZ: "Eswatini", SE: "Sweden", CH: "Switzerland", SY: "Syria", TW: "Taiwan",
  TJ: "Tajikistan", TZ: "Tanzania", TH: "Thailand", TL: "Timor-Leste",
  TG: "Togo", TT: "Trinidad and Tobago", TN: "Tunisia", TR: "Turkey",
  TM: "Turkmenistan", UG: "Uganda", UA: "Ukraine", AE: "United Arab Emirates",
  GB: "United Kingdom", US: "United States", UY: "Uruguay", UZ: "Uzbekistan",
  VE: "Venezuela", VN: "Vietnam", EH: "Western Sahara", YE: "Yemen",
  ZM: "Zambia", ZW: "Zimbabwe", FK: "Falkland Islands", TF: "French Southern Territories",
  VU: "Vanuatu", ST: "Sao Tome and Principe", MK: "North Macedonia",
  AQ: "Antarctica",
};

// Build searchable list
const COUNTRY_LIST = Object.entries(COUNTRY_NAMES)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

interface WorldSearchBarProps {
  onSelect: (code: string, name: string) => void;
  elections?: { countryCode: string; status: string; country: string }[];
}

export default function WorldSearchBar({ onSelect, elections = [] }: WorldSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build election status map for badges
  const electionMap = useMemo(() => {
    const map = new Map<string, string>();
    elections.forEach((e) => map.set(e.countryCode, e.status));
    return map;
  }, [elections]);

  // Filter results
  const results = useMemo(() => {
    if (!query.trim()) return COUNTRY_LIST.slice(0, 20); // Show top 20 when empty
    const q = query.toLowerCase();
    return COUNTRY_LIST.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q
    ).slice(0, 15);
  }, [query]);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIndex(0);
  }, [results]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string, name: string) => {
    setQuery("");
    setIsOpen(false);
    onSelect(code, name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[highlightIndex]) {
      e.preventDefault();
      handleSelect(results[highlightIndex].code, results[highlightIndex].name);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Country code to flag emoji
  const codeToFlag = (code: string) => {
    return code
      .toUpperCase()
      .split("")
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join("");
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg flex items-center gap-2 px-3 py-2 focus-within:border-blue-500/50 transition-colors">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search countries..."
          className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none w-32 sm:w-40"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 right-0 w-64 max-h-72 overflow-y-auto bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-lg shadow-2xl z-[100]"
        >
          {results.map((country, idx) => {
            const status = electionMap.get(country.code);
            return (
              <button
                key={country.code}
                onClick={() => handleSelect(country.code, country.name)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                  idx === highlightIndex
                    ? "bg-blue-500/20 text-white"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <span className="text-base shrink-0">{codeToFlag(country.code)}</span>
                <span className="text-sm font-medium truncate flex-1">{country.name}</span>
                {status && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      status === "Upcoming"
                        ? "bg-amber-500/20 text-amber-300"
                        : status === "Voting Today"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : status === "Completed"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-gray-500/20 text-gray-400"
                    }`}
                  >
                    {status === "Voting Today" ? "LIVE" : status}
                  </span>
                )}
              </button>
            );
          })}
          {results.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-slate-500">
              No countries found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
