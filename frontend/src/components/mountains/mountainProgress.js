// Shared helpers for any page that shows a mountain's personal-progress
// status (completed / planned / not started) against a list of logs.
// Used by CollectionDetailPage, RegionDetailPage, and the Total mountains
// page — kept in one place so "what counts as completed" can never drift
// between views.

export function getMountainLogStatus(mountain, logs) {
  const log = logs.find((item) => item.mountain === mountain.id);
  return log?.status || "not_started";
}

export function getStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "planned")   return "Planned";
  return "Not started";
}

export function computeCompletionCountById(logs) {
  return logs.reduce((acc, log) => {
    if (log.status === "completed") {
      acc[log.mountain] = (acc[log.mountain] || 0) + 1;
    }
    return acc;
  }, {});
}

// A mountain's rank within a specific collection (e.g. book order for
// Wainwrights). Returns "—" when no rank is set for that collection —
// some collections (like Munros) aren't meaningfully ranked.
export function getCollectionRank(mountain, collectionSlug) {
  const membership = mountain.collection_memberships?.find(
    (item) => item.collection?.slug === collectionSlug
  );
  return membership?.rank_in_collection || mountain.rank_in_collection || "—";
}

// completed / planned / total / percent for any scope (a single collection,
// a single region, or the full unscoped mountain list). `expectedTotal`
// lets a collection override the denominator with its curated total
// instead of however many mountains currently exist for that scope.
export function computeScopedStats({ mountains, logs, expectedTotal }) {
  const completedIds = new Set(logs.filter((l) => l.status === "completed").map((l) => l.mountain));
  const plannedIds   = new Set(logs.filter((l) => l.status === "planned").map((l) => l.mountain));
  const completed    = mountains.filter((m) => completedIds.has(m.id)).length;
  const planned      = mountains.filter((m) => plannedIds.has(m.id)).length;
  const total        = expectedTotal || mountains.length || 0;
  const percent       = total ? Math.round((completed / total) * 100) : 0;
  return { completed, planned, total, percent };
}