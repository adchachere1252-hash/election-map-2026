import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

/**
 * Hook that provides a centralized photo lookup function.
 * Uses the photos.batchLookup tRPC endpoint which queries the
 * candidate_photos table (name-keyed single source of truth).
 *
 * Usage:
 *   const { getPhoto, isLoading } = usePhotos(candidateNames);
 *   const url = getPhoto("Jon Ossoff"); // returns photo URL or null
 */
export function usePhotos(names: (string | null | undefined)[]) {
  // Deduplicate and filter null/empty names
  const uniqueNames = useMemo(() => {
    const set = new Set<string>();
    for (const n of names) {
      if (n && n.trim()) set.add(n.trim());
    }
    return Array.from(set);
  }, [JSON.stringify(names.filter(Boolean).sort())]);

  const { data: photoMap, isLoading } = trpc.photos.batchLookup.useQuery(
    { names: uniqueNames },
    {
      enabled: uniqueNames.length > 0,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  const getPhoto = useMemo(() => {
    return (name: string | null | undefined): string | null => {
      if (!name || !photoMap) return null;
      const normalized = name.toLowerCase().trim();
      return photoMap[normalized] ?? null;
    };
  }, [photoMap]);

  return { getPhoto, isLoading, photoMap: photoMap ?? {} };
}
