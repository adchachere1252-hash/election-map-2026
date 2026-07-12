import { useState, useEffect } from "react";

interface CandidateAvatarProps {
  name: string | null | undefined;
  party?: string | null;
  size?: number; // diameter in px, default 36
  className?: string;
  /** Photo URL from the candidate_photos table (name-keyed source of truth). */
  photo?: string | null;
}

/**
 * Circular candidate headshot.
 * 
 * Resolution order:
 * 1. photo prop (from candidate_photos DB table, looked up by name)
 * 2. Party-colored initial avatar (final fallback)
 *
 * The photo prop should be provided by the parent component which gets it
 * from either:
 * - Server-side batch lookup (key races, race popups)
 * - Client-side usePhotos() hook
 */
export function CandidateAvatar({
  name,
  party,
  size = 36,
  className = "",
  photo,
}: CandidateAvatarProps) {
  const [photoFailed, setPhotoFailed] = useState(false);

  // Reset error state when photo URL changes
  useEffect(() => {
    setPhotoFailed(false);
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

  if (photo && !photoFailed) {
    return (
      <span style={style} className={`border border-white/20 ${className}`}>
        <img
          src={photo}
          alt={name ?? ""}
          onError={() => setPhotoFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
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
