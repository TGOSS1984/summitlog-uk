// Dashboard stats computation, shared between the authenticated DashboardPage
// and the public SharedDashboardPage. Every function here is pure (no React,
// no hooks) — given the same mountains/collections/logs/routeLogs, it always
// returns the same numbers, regardless of which page is asking.
//
// This was extracted directly out of DashboardPage's main stats useMemo —
// the logic itself is unchanged, just moved so it has exactly one home.
// Icon components are referenced as plain object values here (not JSX), so
// importing them into a logic-only module is fine — no rendering happens here.

import { TbMountain, TbFlag, TbRoute, TbWalk, TbArrowUp, TbMap2 } from "react-icons/tb";

export const DASHBOARD_COLLECTIONS = [
  { name: "Wainwrights", slug: "wainwrights", expectedTotal: 214 },
  { name: "Munros",      slug: "munros",      expectedTotal: 282 },
  { name: "Nuttalls",    slug: "nuttalls",    expectedTotal: 443 },
];

// ── Tiered achievement definitions ──────────────────────────────────────────

export const TIERED_ACHIEVEMENTS = [
  {
    id: "summits", title: "Summit Bagger", icon: TbMountain,
    tiers: [
      { label: "Bronze", target: 1,  description: "Log your first completed summit" },
      { label: "Silver", target: 10, description: "Complete 10 mountains" },
      { label: "Gold",   target: 50, description: "Complete 50 mountains" },
    ],
  },
  {
    id: "wainwrights", title: "Wainwright Bagger", icon: TbFlag,
    tiers: [
      { label: "Bronze", target: 5,   description: "Complete 5 Wainwrights" },
      { label: "Silver", target: 50,  description: "Complete 50 Wainwrights" },
      { label: "Gold",   target: 214, description: "Complete all 214 Wainwrights" },
    ],
  },
  {
    id: "munros", title: "Munro Bagger", icon: TbMountain,
    tiers: [
      { label: "Bronze", target: 5,   description: "Complete 5 Munros" },
      { label: "Silver", target: 50,  description: "Complete 50 Munros" },
      { label: "Gold",   target: 282, description: "Complete all 282 Munros" },
    ],
  },
  {
    id: "distance", title: "Distance Walker", icon: TbRoute,
    tiers: [
      { label: "Bronze", target: 10,  description: "Log 10km across all routes" },
      { label: "Silver", target: 100, description: "Log 100km across all routes" },
      { label: "Gold",   target: 500, description: "Log 500km across all routes" },
    ],
  },
  {
    id: "steps", title: "Step Counter", icon: TbWalk,
    tiers: [
      { label: "Bronze", target: 10000,  description: "Log 10,000 steps" },
      { label: "Silver", target: 100000, description: "Log 100,000 steps" },
      { label: "Gold",   target: 500000, description: "Log 500,000 steps" },
    ],
  },
  {
    id: "elevation", title: "High Climber", icon: TbArrowUp,
    tiers: [
      { label: "Bronze", target: 1000,  description: "Reach 1,000m combined elevation" },
      { label: "Silver", target: 10000, description: "Reach 10,000m combined elevation" },
      { label: "Gold",   target: 50000, description: "Reach 50,000m combined elevation" },
    ],
  },
  {
    id: "routes", title: "Route Logger", icon: TbMap2,
    tiers: [
      { label: "Bronze", target: 1,  description: "Log your first multi-mountain route" },
      { label: "Silver", target: 5,  description: "Log 5 multi-mountain routes" },
      { label: "Gold",   target: 20, description: "Log 20 multi-mountain routes" },
    ],
  },
];

export const TOTAL_POSSIBLE_BADGES = TIERED_ACHIEVEMENTS.length * 3;

export const TIER_COLORS = { Bronze: "#c97c3a", Silver: "#8b9493", Gold: "var(--color-accent)" };

export const CHART_COLORS = {
  completed: "var(--color-teal)",
  planned:   "var(--color-accent)",
  remaining: "#d9dedc",
  text:      "var(--color-teal-deep)",
};

export function formatDate(dateValue) {
  if (!dateValue) return "No date";
  return new Date(dateValue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function buildTieredAchievements({ completedCount, wainwrightsCompleted, munrosCompleted, totalDistance, totalSteps, totalHeight, routeCount }) {
  const values = {
    summits: completedCount, wainwrights: wainwrightsCompleted, munros: munrosCompleted,
    distance: totalDistance, steps: totalSteps, elevation: totalHeight, routes: routeCount,
  };
  return TIERED_ACHIEVEMENTS.map((ach) => {
    const current = values[ach.id] || 0;
    const activeTierIndex = ach.tiers.reduce((highest, tier, i) => (current >= tier.target ? i : highest), -1);
    const nextTierIndex = activeTierIndex < ach.tiers.length - 1 ? activeTierIndex + 1 : null;
    const nextTier = nextTierIndex !== null ? ach.tiers[nextTierIndex] : null;
    const prevTarget = nextTierIndex !== null && nextTierIndex > 0 ? ach.tiers[nextTierIndex - 1].target : 0;
    const percent = nextTier
      ? Math.min(Math.round(((current - prevTarget) / (nextTier.target - prevTarget)) * 100), 100)
      : 100;
    return {
      ...ach, current, activeTierIndex,
      activeTier:   activeTierIndex >= 0 ? ach.tiers[activeTierIndex] : null,
      nextTier, nextTierIndex, percent,
      allComplete: activeTierIndex === ach.tiers.length - 1,
    };
  });
}

export function countEarnedBadges(tieredAchievements) {
  return tieredAchievements.reduce((sum, a) => sum + (a.activeTierIndex + 1), 0);
}

// ── Heatmap data builder ─────────────────────────────────────────────────────

export function buildHeatmapData(logs) {
  const activityByDate = {};
  logs.forEach((log) => {
    if (log.completed_date) {
      activityByDate[log.completed_date] = (activityByDate[log.completed_date] || 0) + 1;
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(today);
  const dow = startDate.getDay();
  const daysToLastMonday = dow === 0 ? 6 : dow - 1;
  startDate.setDate(startDate.getDate() - daysToLastMonday - 51 * 7);

  const weeks       = [];
  const monthLabels = [];

  for (let w = 0; w < 52; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const dateStr  = date.toISOString().slice(0, 10);
      const isFuture = date > today;
      week.push({ date: dateStr, count: activityByDate[dateStr] || 0, isFuture });
      if (d === 0 && date.getDate() <= 7) {
        monthLabels.push({ week: w, label: date.toLocaleString("en-GB", { month: "short" }) });
      }
    }
    weeks.push(week);
  }

  const totalAscents = Object.values(activityByDate).reduce((s, v) => s + v, 0);
  const activeDays   = Object.keys(activityByDate).length;
  return { weeks, monthLabels, totalAscents, activeDays };
}

// ── Deep stats computation ───────────────────────────────────────────────────
// Computes streak, best month, best year, top region, year breakdown.

export function getISOWeekKey(dateStr) {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-${String(weekNo).padStart(2, "0")}`;
}

export function computeDeepStats(completedLogs) {
  if (!completedLogs || completedLogs.length === 0) return null;
  const datedLogs = completedLogs.filter((l) => l.completed_date);
  if (datedLogs.length === 0) return null;

  // Best month
  const byMonth = {};
  datedLogs.forEach((l) => {
    const key = l.completed_date.slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const bestMonthEntry = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0];
  const bestMonth = bestMonthEntry
    ? { label: new Date(bestMonthEntry[0] + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" }), count: bestMonthEntry[1] }
    : null;

  // Best year + year breakdown
  const byYear = {};
  datedLogs.forEach((l) => {
    const year = l.completed_date.slice(0, 4);
    byYear[year] = (byYear[year] || 0) + 1;
  });
  const yearBreakdown = Object.entries(byYear)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, count]) => ({ year, count }));
  const bestYearEntry = Object.entries(byYear).sort((a, b) => b[1] - a[1])[0];
  const bestYear = bestYearEntry ? { year: bestYearEntry[0], count: bestYearEntry[1] } : null;

  // Longest weekly streak (consecutive ISO weeks)
  const activeWeeks  = Array.from(new Set(datedLogs.map((l) => getISOWeekKey(l.completed_date)))).sort();
  let maxStreak = activeWeeks.length > 0 ? 1 : 0;
  let curStreak = activeWeeks.length > 0 ? 1 : 0;
  for (let i = 1; i < activeWeeks.length; i++) {
    const [py, pw] = activeWeeks[i - 1].split("-").map(Number);
    const [cy, cw] = activeWeeks[i].split("-").map(Number);
    const consecutive =
      (cy === py && cw === pw + 1) ||
      (cy === py + 1 && pw >= 52 && cw === 1);
    if (consecutive) {
      curStreak++;
      maxStreak = Math.max(maxStreak, curStreak);
    } else {
      curStreak = 1;
    }
  }

  // Top region
  const byRegion = {};
  datedLogs.forEach((l) => {
    const region = l.mountain_detail?.region?.name;
    if (region) byRegion[region] = (byRegion[region] || 0) + 1;
  });
  const topRegionEntry = Object.entries(byRegion).sort((a, b) => b[1] - a[1])[0];
  const topRegion = topRegionEntry ? { name: topRegionEntry[0], count: topRegionEntry[1] } : null;

  return { bestMonth, bestYear, longestStreak: maxStreak, topRegion, yearBreakdown };
}

// ── Personal bests ───────────────────────────────────────────────────────────

export function computePersonalBests(logs, mountains) {
  const completedLogs = logs.filter((l) => l.status === "completed");
  if (completedLogs.length === 0) return null;

  const longestHikeLog     = [...completedLogs].filter((l) => l.hike_distance_km).sort((a, b) => Number(b.hike_distance_km) - Number(a.hike_distance_km))[0];
  const completedWithHeight = completedLogs.map((l) => {
    const mountain = mountains.find((m) => m.id === l.mountain);
    return { ...l, height_m: mountain?.height_m || l.mountain_detail?.height_m || 0, mountainName: mountain?.name || l.mountain_detail?.name };
  }).filter((l) => l.height_m > 0);
  const highestPeakLog     = [...completedWithHeight].sort((a, b) => b.height_m - a.height_m)[0];
  const mostStepsLog       = [...completedLogs].filter((l) => l.steps).sort((a, b) => Number(b.steps) - Number(a.steps))[0];
  const longestDurationLog = [...completedLogs].filter((l) => l.hike_duration_hours).sort((a, b) => Number(b.hike_duration_hours) - Number(a.hike_duration_hours))[0];
  const mostRecentLog      = [...completedLogs].filter((l) => l.completed_date).sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];
  const firstSummitLog     = [...completedLogs].filter((l) => l.completed_date).sort((a, b) => new Date(a.completed_date) - new Date(b.completed_date))[0];

  function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return {
    longestHike:  longestHikeLog     ? { value: `${Number(longestHikeLog.hike_distance_km).toFixed(1)}km`, label: "Longest single hike",   mountain: longestHikeLog.mountain_detail?.name     || "—", date: fmtDate(longestHikeLog.completed_date) }     : null,
    highestPeak:  highestPeakLog     ? { value: `${highestPeakLog.height_m}m`,                             label: "Highest peak summited",  mountain: highestPeakLog.mountainName               || "—", date: fmtDate(highestPeakLog.completed_date) }     : null,
    mostSteps:    mostStepsLog       ? { value: Number(mostStepsLog.steps).toLocaleString(),               label: "Most steps in one day",  mountain: mostStepsLog.mountain_detail?.name        || "—", date: fmtDate(mostStepsLog.completed_date) }       : null,
    longestHours: longestDurationLog ? { value: `${Number(longestDurationLog.hike_duration_hours)}hrs`,    label: "Longest hike duration",  mountain: longestDurationLog.mountain_detail?.name  || "—", date: fmtDate(longestDurationLog.completed_date) } : null,
    mostRecent:   mostRecentLog      ? { value: fmtDate(mostRecentLog.completed_date),                     label: "Most recent summit",     mountain: mostRecentLog.mountain_detail?.name       || "—", date: null }                                       : null,
    firstSummit:  firstSummitLog     ? { value: fmtDate(firstSummitLog.completed_date),                    label: "First summit logged",    mountain: firstSummitLog.mountain_detail?.name      || "—", date: null }                                       : null,
  };
}

// ── Collection membership helpers ────────────────────────────────────────────

export function mountainBelongsToCollection(mountain, collectionSlug) {
  return (
    mountain.collection_memberships?.some((m) => m.collection?.slug === collectionSlug) ||
    mountain.collection?.slug === collectionSlug
  );
}

export function getMountainCollectionNames(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships.map((m) => m.collection?.name).filter(Boolean).join(" / ");
  }
  return mountain.collection?.name || "Unlisted";
}

export function getLogCollectionNames(log) {
  return log.mountain_detail ? getMountainCollectionNames(log.mountain_detail) : "Unlisted";
}

// ── Main computation ─────────────────────────────────────────────────────────
// Identical logic to what previously lived inline in DashboardPage's stats
// useMemo (real-data branch only — the demo branch stays page-local, since
// demo data is never relevant to a publicly shared view of a real user).

export function computeRealDashboardStats({ mountains, collections, logs, routeLogs }) {
  const completedLogs        = logs.filter((log) => log.status === "completed");
  const plannedLogs          = logs.filter((log) => log.status === "planned");
  const completedMountainIds = new Set(completedLogs.map((log) => log.mountain));
  const loggedMountainIds    = new Set(logs.map((log) => log.mountain));

  const totalDistance       = completedLogs.reduce((t, l) => t + Number(l.hike_distance_km || 0), 0);
  const totalHeight         = mountains.filter((m) => completedMountainIds.has(m.id)).reduce((t, m) => t + Number(m.height_m || 0), 0);
  const totalSteps          = completedLogs.reduce((t, l) => t + Number(l.steps || 0), 0);
  const totalFlightsClimbed = completedLogs.reduce((t, l) => t + Number(l.flights_climbed || 0), 0);

  const collectionStats = DASHBOARD_COLLECTIONS.map((dc) => {
    const apiCol         = collections.find((c) => c.slug === dc.slug);
    const colMountains   = mountains.filter((m) => mountainBelongsToCollection(m, dc.slug));
    const completedCount = colMountains.filter((m) => completedMountainIds.has(m.id)).length;
    const totalCount     = apiCol?.expected_total || dc.expectedTotal || colMountains.length || 0;
    return { id: apiCol?.id || dc.slug, name: dc.name, slug: dc.slug, completed: completedCount, total: totalCount, percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0 };
  });

  const statusChartData = [
    { name: "Completed", value: completedLogs.length },
    { name: "Planned",   value: plannedLogs.length },
    { name: "Remaining", value: Math.max(mountains.length - loggedMountainIds.size, 0) },
  ];
  const collectionChartData = collectionStats.map((c) => ({ name: c.name, completed: c.completed, remaining: Math.max(c.total - c.completed, 0) }));

  const monthlyCompletionData = completedLogs.filter((l) => l.completed_date).reduce((months, l) => {
    const key = new Date(l.completed_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    months[key] = (months[key] || 0) + 1;
    return months;
  }, {});
  const completionTimelineData = Object.entries(monthlyCompletionData)
    .map(([month, completed]) => ({ month, completed }))
    .sort((a, b) => new Date(`1 ${a.month}`) - new Date(`1 ${b.month}`));

  const recentLogs    = [...logs].sort((a, b) => new Date(b.completed_date || b.updated_at || b.created_at) - new Date(a.completed_date || a.updated_at || a.created_at)).slice(0, 4);
  const nextObjective = plannedLogs[0] || null;
  const photoLogs     = logs.filter((l) => l.uploaded_image).slice(0, 4);
  const elevationPercent = Math.min(Math.round((totalHeight / 50000) * 100), 100);

  const routeCount   = routeLogs.length;
  const recentRoutes = [...routeLogs].sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date)).slice(0, 3);

  const personalBests = computePersonalBests(logs, mountains);

  const completionCountByName = completedLogs.reduce((acc, l) => {
    const name = l.mountain_detail?.name;
    const slug = l.mountain_detail?.slug;
    if (name) {
      if (!acc[name]) acc[name] = { name, slug: slug || "", count: 0 };
      acc[name].count += 1;
    }
    return acc;
  }, {});
  const mostSummited = Object.values(completionCountByName).filter((m) => m.count > 1).sort((a, b) => b.count - a.count).slice(0, 10);

  const scatterData = completedLogs
    .filter((l) => l.mountain_detail?.height_m && l.hike_distance_km)
    .map((l) => ({ x: Number(l.mountain_detail.height_m), y: Number(l.hike_distance_km), name: l.mountain_detail.name }));

  const achievements       = buildTieredAchievements({ completedCount: completedLogs.length, wainwrightsCompleted: collectionStats.find((c) => c.slug === "wainwrights")?.completed || 0, munrosCompleted: collectionStats.find((c) => c.slug === "munros")?.completed || 0, totalDistance, totalSteps, totalHeight, routeCount });
  const earnedBadgeCount   = countEarnedBadges(achievements);
  const achievementPercent = TOTAL_POSSIBLE_BADGES > 0 ? Math.round((earnedBadgeCount / TOTAL_POSSIBLE_BADGES) * 100) : 0;

  const upcomingPlanned = plannedLogs
    .filter((l) => l.completed_date)
    .sort((a, b) => new Date(a.completed_date) - new Date(b.completed_date))
    .slice(0, 6);

  const heatmapLogs = completedLogs;
  const deepStats   = computeDeepStats(completedLogs);

  return {
    completed: completedLogs.length, planned: plannedLogs.length, totalVisible: mountains.length,
    totalDistance, totalHeight, totalSteps, totalFlightsClimbed,
    collectionStats, statusChartData, collectionChartData, recentLogs, nextObjective,
    photoLogs, elevationPercent, achievements, earnedBadgeCount, achievementPercent,
    regionStats: ["Lake District", "Scotland", "Wales", "England"].map((regionName) => {
      const regionMountains = mountains.filter((m) => m.region?.name === regionName);
      const completed = regionMountains.filter((m) => completedMountainIds.has(m.id)).length;
      const planned   = regionMountains.filter((m) => plannedLogs.some((l) => l.mountain === m.id)).length;
      const total     = regionMountains.length;
      return { name: regionName, completed, planned, total, percent: total ? Math.round((completed / total) * 100) : 0 };
    }),
    completionTimelineData, personalBests, mostSummited, scatterData,
    routeCount, recentRoutes,
    upcomingPlanned, heatmapLogs, deepStats,
  };
}