import { useState, useEffect } from "react";
import { getCandidatePhotoUrl } from "@/lib/candidatePhotos";

interface CandidateAvatarProps {
  name: string | null | undefined;
  party?: string | null;
  size?: number; // diameter in px, default 36
  className?: string;
  /** Explicit photo URL (e.g., from DB candidate1_photo column). Takes priority over name-based lookup. */
  photo?: string | null;
}

/**
 * Circular candidate headshot using official Congressional bioguide photos.
 * Falls back to a party-colored initial avatar for non-Congress candidates.
 *
 * Resolution order:
 * 1. Explicit DB photo prop (if provided and loads successfully)
 * 2. Name-based lookup from CDN_PHOTOS / BIOGUIDE_MAP (if DB photo fails or absent)
 * 3. Party-colored initial avatar (final fallback)
 */
export function CandidateAvatar({
  name,
  party,
  size = 36,
  className = "",
  photo,
}: CandidateAvatarProps) {
  const nameBasedUrl = getCandidatePhotoUrl(name);
  // Track which source we're currently trying
  const [dbPhotoFailed, setDbPhotoFailed] = useState(false);
  const [namePhotoFailed, setNamePhotoFailed] = useState(false);

  // Determine which URL to show
  let photoUrl: string | null = null;
  if (photo && !dbPhotoFailed) {
    photoUrl = photo;
  } else if (nameBasedUrl && !namePhotoFailed) {
    photoUrl = nameBasedUrl;
  }

  // Reset error states whenever the inputs change
  useEffect(() => {
    setDbPhotoFailed(false);
    setNamePhotoFailed(false);
  }, [photo, name]);

  // Determine party color for fallback avatar
  const partyKey = (party || "").toUpperCase();
  const isD = partyKey === "D" || partyKey === "DEM" || partyKey === "DEMOCRAT" || partyKey === "DEMOCRATIC";
  const isR = partyKey === "R" || partyKey === "REP" || partyKey === "REPUBLICAN";
  const isI = partyKey === "I" || partyKey === "IND" || partyKey === "INDEPENDENT";
  const bgColor = isD
    ? "oklch(0.45 0.18 260)"   // blue
    : isR
    ? "oklch(0.45 0.20 25)"    // red
    : isI
    ? "oklch(0.50 0.12 75)"    // amber/gold for Independent
    : "oklch(0.40 0.00 0)";    // gray

  // Get initials from name
  const initials = name
    ? name
        .replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase())
        .slice(0, 2)
        .join("")
    : "?";

  const style: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  if (photoUrl) {
    return (
      <span style={style} className={`border border-white/20 ${className}`}>
        <img
          src={photoUrl}
          alt={name ?? ""}
          onError={() => {
            // If the DB photo failed, try name-based lookup next
            if (photo && !dbPhotoFailed) {
              setDbPhotoFailed(true);
            } else {
              // Name-based also failed, show initials
              setNamePhotoFailed(true);
            }
          }}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
          loading="eager"
        />
      </span>
    );
  }

  // Fallback: party-colored initial avatar
  return (
    <span
      style={{ ...style, background: bgColor }}
      className={`border border-white/20 ${className}`}
    >
      <span
        style={{
          color: "white",
          fontSize: Math.round(size * 0.38),
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {initials}
      </span>
    </span>
  );
}
