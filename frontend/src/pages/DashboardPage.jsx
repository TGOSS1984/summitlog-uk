import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart,
  Area, AreaChart, Scatter, ScatterChart, ReferenceLine,
} from "recharts";
import {
  TbMountain, TbRoute, TbRuler, TbStairs, TbWalk,
  TbTrophy, TbFlag, TbStar,
  TbTargetArrow, TbUser,
  TbCalendar, TbArrowUp, TbRepeat, TbMap2, TbChevronRight,
  TbX, TbFlame, TbMapPin,
} from "react-icons/tb";

import { getCollections, getMountains, getProgressLogs, getRouteLogs, getCurrentUser, exportLogs } from "../lib/api";

const DASHBOARD_COLLECTIONS = [
  { name: "Wainwrights", slug: "wainwrights", expectedTotal: 214 },
  { name: "Munros",      slug: "munros",      expectedTotal: 282 },
  { name: "Nuttalls",    slug: "nuttalls",    expectedTotal: 443 },
];

const CHART_COLORS = {
  completed: "var(--color-teal)",
  planned:   "var(--color-accent)",
  remaining: "#d9dedc",
  text:      "var(--color-teal-deep)",
};

const STAT_ICONS = {
  "Completed":       { icon: TbMountain, color: "var(--color-teal-deep)" },
  "Planned":         { icon: TbFlag,     color: "var(--color-accent)" },
  "Routes logged":   { icon: TbMap2,     color: "var(--color-accent)" },
  "Distance":        { icon: TbRoute,    color: "var(--color-teal)" },
  "Height total":    { icon: TbRuler,    color: "var(--color-accent)" },
  "Steps":           { icon: TbWalk,     color: "var(--color-teal)" },
  "Flights climbed": { icon: TbStairs,   color: "var(--color-teal-deep)" },
};

// ── Tiered achievement definitions ──────────────────────────────────────────

const TIERED_ACHIEVEMENTS = [
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

const TOTAL_POSSIBLE_BADGES = TIERED_ACHIEVEMENTS.length * 3;

function buildTieredAchievements({ completedCount, wainwrightsCompleted, munrosCompleted, totalDistance, totalSteps, totalHeight, routeCount }) {
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

function countEarnedBadges(tieredAchievements) {
  return tieredAchievements.reduce((sum, a) => sum + (a.activeTierIndex + 1), 0);
}

// ── Heatmap data builder ─────────────────────────────────────────────────────

function buildHeatmapData(logs) {
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

function getISOWeekKey(dateStr) {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayOfWeek);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-${String(weekNo).padStart(2, "0")}`;
}

function computeDeepStats(completedLogs) {
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

// ── Achievement notifications hook ──────────────────────────────────────────
// On first ever load: silently populates localStorage (no toast flood).
// On subsequent loads: only notifies for badges newly earned since last visit.

const BADGE_STORAGE_KEY = "summitlog-earned-badges";

function useAchievementNotifications(achievements, isDemo) {
  const [queue,   setQueue]   = useState([]);
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    if (isDemo || !achievements || achievements.length === 0) return;

    let stored     = {};
    let isFirstLoad = false;
    try {
      const raw = localStorage.getItem(BADGE_STORAGE_KEY);
      if (raw) { stored = JSON.parse(raw); }
      else      { isFirstLoad = true; }
    } catch {}

    const newBadges = [];
    achievements.forEach((ach) => {
      ach.tiers.forEach((tier, i) => {
        const key = `${ach.id}-${i}`;
        if (i <= ach.activeTierIndex && !stored[key]) {
          if (!isFirstLoad) {
            newBadges.push({ key, achTitle: ach.title, tierLabel: tier.label, icon: ach.icon });
          }
          stored[key] = true;
        }
      });
    });

    localStorage.setItem(BADGE_STORAGE_KEY, JSON.stringify(stored));
    if (newBadges.length > 0) setQueue((q) => [...q, ...newBadges]);
  }, [achievements, isDemo]);

  // Dequeue one at a time
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((q) => q.slice(1));
    }
  }, [current, queue]);

  function dismiss() { setCurrent(null); }
  return { current, dismiss };
}

// ── Achievement notification toast ──────────────────────────────────────────

function AchievementNotification({ badge, onDismiss }) {
  useEffect(() => {
    if (!badge) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [badge, onDismiss]);

  if (!badge) return null;

  const Icon      = badge.icon || TbTrophy;
  const tierColor = TIER_COLORS[badge.tierLabel] || "var(--color-accent)";

  return (
    <div className="achievement-notification" role="alert" aria-live="polite">
      <div className="achievement-notification__icon" style={{ background: tierColor }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="achievement-notification__text">
        <strong>Achievement unlocked!</strong>
        <p>{badge.tierLabel} · {badge.achTitle}</p>
      </div>
      <button
        type="button"
        className="achievement-notification__close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <TbX size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ── Personal stats depth panel ───────────────────────────────────────────────

function PersonalStatsDepthPanel({ deepStats, isDemo }) {
  if (!deepStats) return null;
  const { bestMonth, bestYear, longestStreak, topRegion, yearBreakdown } = deepStats;
  const hasCards = longestStreak > 0 || bestMonth || bestYear || topRegion;
  const hasChart = yearBreakdown && yearBreakdown.length > 1;
  if (!hasCards && !hasChart) return null;

  return (
    <div className="dashboard-deep-stats">
      <div className="dashboard-deep-stats__header">
        <p className="section-kicker"><span className="kicker-line" />Your stats in depth</p>
        <h2>Personal records</h2>
        <p>Streaks, best months and your year-by-year breakdown.</p>
      </div>

      {hasCards && (
        <div className="dashboard-deep-stats__grid">
          {longestStreak > 0 && (
            <article className="dashboard-deep-stat-card">
              <div className="dashboard-deep-stat-card__icon">
                <TbFlame size={22} strokeWidth={1.5} style={{ color: "#e85d04" }} />
              </div>
              <p>Longest active streak</p>
              <strong>{longestStreak} {longestStreak === 1 ? "week" : "weeks"}</strong>
              <span>consecutive weeks with an ascent</span>
            </article>
          )}
          {bestMonth && (
            <article className="dashboard-deep-stat-card">
              <div className="dashboard-deep-stat-card__icon">
                <TbCalendar size={22} strokeWidth={1.5} style={{ color: "var(--color-teal)" }} />
              </div>
              <p>Best month</p>
              <strong>{bestMonth.count} summit{bestMonth.count !== 1 ? "s" : ""}</strong>
              <span>{bestMonth.label}</span>
            </article>
          )}
          {bestYear && (
            <article className="dashboard-deep-stat-card">
              <div className="dashboard-deep-stat-card__icon">
                <TbMountain size={22} strokeWidth={1.5} style={{ color: "var(--color-teal-deep)" }} />
              </div>
              <p>Best year</p>
              <strong>{bestYear.count} summit{bestYear.count !== 1 ? "s" : ""}</strong>
              <span>in {bestYear.year}</span>
            </article>
          )}
          {topRegion && (
            <article className="dashboard-deep-stat-card">
              <div className="dashboard-deep-stat-card__icon">
                <TbMapPin size={22} strokeWidth={1.5} style={{ color: "var(--color-accent)" }} />
              </div>
              <p>Favourite region</p>
              <strong>{topRegion.name}</strong>
              <span>{topRegion.count} ascent{topRegion.count !== 1 ? "s" : ""}</span>
            </article>
          )}
        </div>
      )}

      {hasChart && (
        <div className="dashboard-deep-stats__chart">
          <p className="dashboard-deep-stats__chart-label">Summits per year</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={yearBreakdown} margin={{ top: 8, right: 16, bottom: 4, left: 4 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,57,59,0.1)" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => [value, "Summits"]} cursor={{ fill: "rgba(4,57,59,0.05)" }} />
              <Bar dataKey="count" fill="var(--color-teal)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDemoStats() {
  const seed = Math.floor(Date.now() / 60000);
  const rng  = seededRandom(seed);

  const completed           = Math.floor(rng() * 60) + 8;
  const planned             = Math.floor(rng() * 20) + 3;
  const totalDistance       = Math.floor(rng() * 300) + 50;
  const totalHeight         = Math.floor(rng() * 30000) + 5000;
  const totalSteps          = Math.floor(rng() * 400000) + 50000;
  const totalFlightsClimbed = Math.floor(rng() * 800) + 100;
  const wainwrightsCompleted = Math.floor(rng() * 80) + 5;
  const munrosCompleted      = Math.floor(rng() * 60) + 3;
  const nuttallsCompleted    = Math.floor(rng() * 50) + 2;

  const collectionStats = [
    { id: "wainwrights", name: "Wainwrights", slug: "wainwrights", completed: wainwrightsCompleted, total: 214, percent: Math.round((wainwrightsCompleted / 214) * 100) },
    { id: "munros",      name: "Munros",      slug: "munros",      completed: munrosCompleted,      total: 282, percent: Math.round((munrosCompleted / 282) * 100) },
    { id: "nuttalls",    name: "Nuttalls",    slug: "nuttalls",    completed: nuttallsCompleted,    total: 443, percent: Math.round((nuttallsCompleted / 443) * 100) },
  ];

  const statusChartData      = [
    { name: "Completed", value: completed },
    { name: "Planned",   value: planned },
    { name: "Remaining", value: 800 - completed - planned },
  ];
  const collectionChartData  = collectionStats.map((c) => ({ name: c.name, completed: c.completed, remaining: Math.max(c.total - c.completed, 0) }));
  const months               = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const completionTimelineData = months.slice(0, 8).map((month) => ({ month, completed: Math.floor(rng() * 8) + 1 }));
  const elevationPercent     = Math.min(Math.round((totalHeight / 50000) * 100), 100);

  const recentRoutes = [
    { id: 1, name: "Fairfield Horseshoe",         completed_date: "2024-08-01", mountains_count: 8 },
    { id: 2, name: "Helvellyn via Striding Edge",  completed_date: "2024-07-10", mountains_count: 3 },
  ];

  const achievements       = buildTieredAchievements({ completedCount: completed, wainwrightsCompleted, munrosCompleted, totalDistance, totalSteps, totalHeight, routeCount: recentRoutes.length });
  const earnedBadgeCount   = countEarnedBadges(achievements);
  const achievementPercent = Math.round((earnedBadgeCount / TOTAL_POSSIBLE_BADGES) * 100);

  const regionStats = [
    { name: "Lake District", completed: Math.floor(rng() * 30) + 2, planned: Math.floor(rng() * 8),  total: 214 },
    { name: "Scotland",      completed: Math.floor(rng() * 25) + 1, planned: Math.floor(rng() * 10), total: 282 },
    { name: "Wales",         completed: Math.floor(rng() * 20) + 1, planned: Math.floor(rng() * 6),  total: 120 },
    { name: "England",       completed: Math.floor(rng() * 15) + 1, planned: Math.floor(rng() * 5),  total: 184 },
  ].map((r) => ({ ...r, percent: Math.round((r.completed / r.total) * 100) }));

  const demoLogs = [
    { id: 1, mountain_detail: { name: "Scafell Pike", slug: "scafell-pike", height_m: 978,  region: { name: "Lake District" } }, status: "completed", completed_date: "2024-08-14", hike_distance_km: 12.4, steps: 24000, hike_duration_hours: 6.5,  route_name: null },
    { id: 2, mountain_detail: { name: "Helvellyn",    slug: "helvellyn",    height_m: 950,  region: { name: "Lake District" } }, status: "completed", completed_date: "2024-07-22", hike_distance_km: 9.8,  steps: 19500, hike_duration_hours: 5.2,  route_name: null },
    { id: 3, mountain_detail: { name: "Ben Nevis",    slug: "ben-nevis",    height_m: 1345, region: { name: "Scotland" }       }, status: "planned",   completed_date: null,         hike_distance_km: null, steps: null,  hike_duration_hours: null, route_name: null },
    { id: 4, mountain_detail: { name: "Snowdon",      slug: "snowdon",      height_m: 1085, region: { name: "Wales" }          }, status: "completed", completed_date: "2024-06-10", hike_distance_km: 8.2,  steps: 16800, hike_duration_hours: 4.8,  route_name: null },
    { id: 5, mountain_detail: { name: "Skiddaw",      slug: "skiddaw",      height_m: 931,  region: { name: "Lake District" }  }, status: "completed", completed_date: "2024-05-30", hike_distance_km: 7.6,  steps: 15200, hike_duration_hours: 4.1,  route_name: null },
  ];

  const personalBests = {
    longestHike:  { value: "12.4km",     label: "Longest single hike",   mountain: "Scafell Pike", date: "14 Aug 2024" },
    highestPeak:  { value: "978m",        label: "Highest peak summited", mountain: "Scafell Pike", date: "14 Aug 2024" },
    mostSteps:    { value: "24,000",      label: "Most steps in one day", mountain: "Scafell Pike", date: "14 Aug 2024" },
    longestHours: { value: "6.5hrs",      label: "Longest hike duration", mountain: "Scafell Pike", date: "14 Aug 2024" },
    mostRecent:   { value: "14 Aug 2024", label: "Most recent summit",    mountain: "Scafell Pike", date: null },
    firstSummit:  { value: "30 May 2024", label: "First summit logged",   mountain: "Skiddaw",      date: null },
  };

  const mostSummited = [
    { name: "Helvellyn",    slug: "helvellyn",    count: 7 },
    { name: "Scafell Pike", slug: "scafell-pike", count: 4 },
    { name: "Blencathra",   slug: "blencathra",   count: 3 },
    { name: "Great Gable",  slug: "great-gable",  count: 3 },
    { name: "Skiddaw",      slug: "skiddaw",      count: 2 },
  ];

  const scatterData = [
    { x: 978,  y: 12.4, name: "Scafell Pike" }, { x: 950,  y: 9.8,  name: "Helvellyn" },
    { x: 931,  y: 7.6,  name: "Skiddaw" },       { x: 1085, y: 8.2,  name: "Snowdon" },
    { x: 828,  y: 10.1, name: "Great Gable" },    { x: 868,  y: 8.4,  name: "Blencathra" },
    { x: 762,  y: 5.8,  name: "Fairfield" },      { x: 670,  y: 4.4,  name: "Haystacks" },
    { x: 605,  y: 4.1,  name: "Place Fell" },     { x: 1309, y: 16.2, name: "Ben Macdui" },
    { x: 1296, y: 14.8, name: "Braeriach" },       { x: 1214, y: 13.1, name: "Cairn Toul" },
    { x: 800,  y: 10.2, name: "Cadair Idris" },    { x: 721,  y: 6.2,  name: "High Street" },
    { x: 899,  y: 11.4, name: "Bow Fell" },        { x: 736,  y: 7.8,  name: "Dale Head" },
  ];

  const now = new Date();
  const upcomingPlanned = [
    { id: 101, mountain_detail: { name: "Ben Nevis",    slug: "ben-nevis",    height_m: 1345, region: { name: "Scotland" }       }, status: "planned", completed_date: new Date(now.getTime() + 12  * 86400000).toISOString().slice(0, 10) },
    { id: 102, mountain_detail: { name: "Scafell Pike", slug: "scafell-pike", height_m: 978,  region: { name: "Lake District" }  }, status: "planned", completed_date: new Date(now.getTime() + 28  * 86400000).toISOString().slice(0, 10) },
    { id: 103, mountain_detail: { name: "Snowdon",      slug: "snowdon",      height_m: 1085, region: { name: "Wales" }          }, status: "planned", completed_date: new Date(now.getTime() + 52  * 86400000).toISOString().slice(0, 10) },
  ];

  const baseNow = new Date();
  const demoHeatmapLogs = [];
  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(rng() * 340) + 1;
    const d = new Date(baseNow);
    d.setDate(d.getDate() - daysAgo);
    demoHeatmapLogs.push({ completed_date: d.toISOString().slice(0, 10) });
  }

  // Demo deep stats — realistic fixed values
  const demoDeepStats = {
    longestStreak: 8,
    bestMonth:     { label: "August 2024", count: 12 },
    bestYear:      { year: "2024", count: 28 },
    topRegion:     { name: "Lake District", count: 18 },
    yearBreakdown: [
      { year: "2022", count: 4 },
      { year: "2023", count: 11 },
      { year: "2024", count: 28 },
    ],
  };

  return {
    completed, planned, totalVisible: 800, totalDistance, totalHeight, totalSteps, totalFlightsClimbed,
    collectionStats, statusChartData, collectionChartData, completionTimelineData,
    recentLogs: demoLogs, nextObjective: demoLogs.find((l) => l.status === "planned") || null,
    photoLogs: [], elevationPercent,
    achievements, earnedBadgeCount, achievementPercent,
    regionStats, personalBests, mostSummited, scatterData,
    routeCount: recentRoutes.length, recentRoutes,
    upcomingPlanned,
    heatmapLogs: demoHeatmapLogs,
    deepStats: demoDeepStats,
  };
}

function computePersonalBests(logs, mountains) {
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

function useCountUp(target, duration = 1200, trigger = true) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (!trigger || target === 0) { setValue(target); return; }
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, trigger]);
  return value;
}

function StatCard({ label, rawValue, sub, loaded }) {
  const meta = STAT_ICONS[label] || { icon: TbStar, color: "var(--color-teal)" };
  const Icon = meta.icon;
  const numericTarget = parseFloat(String(rawValue).replace(/[^0-9.]/g, "")) || 0;
  const suffix  = String(rawValue).replace(/[0-9.,]/g, "").trim();
  const counted = useCountUp(numericTarget, 1400, loaded);
  const display = numericTarget > 0
    ? (Number.isInteger(numericTarget) ? counted.toLocaleString() : counted.toFixed(1)) + (suffix || "")
    : rawValue;
  return (
    <article className="dashboard-stat-card">
      <div className="dashboard-stat-card__icon" style={{ color: meta.color }}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <p>{label}</p>
      <strong>{display}</strong>
      <span>{sub}</span>
    </article>
  );
}

const PB_META = [
  { key: "longestHike",  icon: TbRoute,    color: "var(--color-teal)" },
  { key: "highestPeak",  icon: TbArrowUp,  color: "var(--color-accent)" },
  { key: "mostSteps",    icon: TbWalk,     color: "var(--color-teal)" },
  { key: "longestHours", icon: TbStairs,   color: "var(--color-teal-deep)" },
  { key: "mostRecent",   icon: TbCalendar, color: "var(--color-accent)" },
  { key: "firstSummit",  icon: TbTrophy,   color: "var(--color-teal-deep)" },
];

function PersonalBests({ personalBests }) {
  if (!personalBests) return null;
  const items = PB_META.map((m) => ({ ...m, data: personalBests[m.key] })).filter((m) => m.data);
  if (items.length === 0) return null;
  return (
    <div className="dashboard-pb-panel">
      <div className="dashboard-pb-header">
        <p className="section-kicker"><span className="kicker-line" />Personal bests</p>
        <h2>Your summit records</h2>
        <p>Your best logged stats across all completed ascents.</p>
      </div>
      <div className="dashboard-pb-grid">
        {items.map(({ key, icon: Icon, color, data }) => (
          <article className="dashboard-pb-card" key={key}>
            <div className="dashboard-pb-card__icon" style={{ color }}><Icon size={20} strokeWidth={1.5} /></div>
            <p className="dashboard-pb-card__label">{data.label}</p>
            <strong className="dashboard-pb-card__value">{data.value}</strong>
            <p className="dashboard-pb-card__mountain">{data.mountain}</p>
            {data.date && <span className="dashboard-pb-card__date">{data.date}</span>}
          </article>
        ))}
      </div>
    </div>
  );
}

// ── Coming Up panel ──────────────────────────────────────────────────────────

function daysUntilLabel(dateStr) {
  if (!dateStr) return null;
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff   = Math.round((target - today) / 86400000);
  if (diff < 0)  return "Overdue";
  if (diff === 0) return "Today!";
  if (diff === 1) return "Tomorrow";
  if (diff < 7)   return `${diff} days`;
  if (diff < 14)  return "Next week";
  if (diff < 30)  return `${Math.round(diff / 7)} weeks`;
  return `${Math.round(diff / 30)} months`;
}

function ComingUpPanel({ upcomingPlanned, isDemo }) {
  if (!upcomingPlanned || upcomingPlanned.length === 0) return null;
  return (
    <div className="dashboard-coming-up">
      <div className="dashboard-coming-up__header">
        <p className="section-kicker"><span className="kicker-line" />Coming up</p>
        <h2>Planned summits</h2>
        <p>Mountains you've marked as planned with a target date, sorted by how soon they are.</p>
      </div>
      <div className="dashboard-coming-up__list">
        {upcomingPlanned.map((log) => {
          const until     = daysUntilLabel(log.completed_date);
          const daysLeft  = log.completed_date ? Math.round((new Date(log.completed_date) - new Date()) / 86400000) : null;
          const isImminent = daysLeft !== null && daysLeft <= 7;
          return (
            <Link
              to={isDemo ? "#" : `/mountains/${log.mountain_detail?.slug}`}
              className={`dashboard-coming-up__item${isImminent ? " dashboard-coming-up__item--imminent" : ""}`}
              key={log.id}
            >
              <div className="dashboard-coming-up__item-left">
                <span className="dashboard-coming-up__countdown">{until}</span>
                <span className="dashboard-coming-up__date">{formatDate(log.completed_date)}</span>
              </div>
              <div className="dashboard-coming-up__item-main">
                <strong>{log.mountain_detail?.name}</strong>
                <span>
                  {log.mountain_detail?.height_m}m
                  {log.mountain_detail?.region?.name && ` · ${log.mountain_detail.region.name}`}
                </span>
              </div>
              <TbChevronRight size={16} strokeWidth={2} className="dashboard-coming-up__arrow" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Activity heatmap ─────────────────────────────────────────────────────────

function ActivityHeatmap({ logs }) {
  const { weeks, monthLabels, totalAscents, activeDays } = buildHeatmapData(logs);
  if (totalAscents === 0) return null;

  const CELL = 12; const GAP = 3; const STEP = CELL + GAP;
  const LEFT_PAD = 28; const TOP_PAD = 20;
  const svgW = LEFT_PAD + 52 * STEP;
  const svgH = TOP_PAD  +  7 * STEP;
  const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

  function cellColor(count, isFuture) {
    if (isFuture) return "rgba(4,57,59,0.04)";
    if (count === 0) return "rgba(4,57,59,0.09)";
    if (count === 1) return "rgba(4,57,59,0.38)";
    if (count === 2) return "var(--color-teal)";
    return "var(--color-accent)";
  }

  return (
    <div className="activity-heatmap">
      <div className="activity-heatmap__header">
        <p className="section-kicker"><span className="kicker-line" />Activity</p>
        <h2>Ascent calendar</h2>
        <p>{activeDays} active {activeDays === 1 ? "day" : "days"} · {totalAscents} {totalAscents === 1 ? "ascent" : "ascents"} in the past year</p>
      </div>
      <div className="activity-heatmap__scroll">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="activity-heatmap__svg" aria-label="Ascent activity heatmap" role="img">
          {monthLabels.map(({ week, label }) => (
            <text key={`${week}-${label}`} x={LEFT_PAD + week * STEP} y={12} fontSize="9" fontWeight="700" fill="#8b9493" fontFamily="DM Sans, sans-serif">{label}</text>
          ))}
          {DAY_LABELS.map((label, di) =>
            label ? (
              <text key={di} x={LEFT_PAD - 5} y={TOP_PAD + di * STEP + CELL * 0.82} fontSize="8" fill="#8b9493" textAnchor="end" fontFamily="DM Sans, sans-serif">{label}</text>
            ) : null
          )}
          {weeks.map((week, wi) =>
            week.map((day, di) => (
              <rect key={day.date} x={LEFT_PAD + wi * STEP} y={TOP_PAD + di * STEP} width={CELL} height={CELL} rx={2.5} fill={cellColor(day.count, day.isFuture)}>
                <title>{day.date}: {day.count} {day.count === 1 ? "ascent" : "ascents"}</title>
              </rect>
            ))
          )}
        </svg>
      </div>
      <div className="activity-heatmap__legend">
        <span>Less</span>
        {[0, 1, 2, 3].map((v) => (
          <span key={v} className="activity-heatmap__legend-dot" style={{ background: cellColor(v, false) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Most summited horizontal bar chart ──────────────────────────────────────
function MostSummitedChart({ data }) {
  if (!data || data.length === 0) return null;
  const chartHeight = Math.max(200, data.length * 52);
  return (
    <article className="dashboard-chart-card dashboard-chart-card--most-summited">
      <div>
        <p className="section-kicker">
          <TbRepeat size={13} strokeWidth={2} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Summit repeats
        </p>
        <h3>Most summited mountains</h3>
      </div>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(4,57,59,0.10)" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} label={{ value: "ascents", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "#8b9493" }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} width={120} />
          <Tooltip formatter={(value) => [`${value} ${value === 1 ? "ascent" : "ascents"}`, "Times summited"]} cursor={{ fill: "rgba(4,57,59,0.05)" }} />
          <Bar dataKey="count" fill="var(--color-accent)" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 12, fill: "#243b3a", fontWeight: 700 }} />
        </BarChart>
      </ResponsiveContainer>
    </article>
  );
}

// ── Height vs Distance scatter chart ────────────────────────────────────────
function HeightVsDistanceChart({ data }) {
  if (!data || data.length === 0) return null;
  const avgDistance = data.length ? Math.round((data.reduce((s, d) => s + d.y, 0) / data.length) * 10) / 10 : 0;
  const avgHeight   = data.length ? Math.round(data.reduce((s, d) => s + d.x, 0) / data.length) : 0;
  return (
    <article className="dashboard-chart-card dashboard-chart-card--scatter">
      <div>
        <p className="section-kicker">
          <TbRoute size={13} strokeWidth={2} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Ascent profile
        </p>
        <h3>Height vs distance</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 12, right: 16, bottom: 28, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(4,57,59,0.10)" />
          <XAxis type="number" dataKey="x" name="Height" unit="m" tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} label={{ value: "Summit height (m)", position: "insideBottom", offset: -14, fontSize: 11, fill: "#8b9493" }} />
          <YAxis type="number" dataKey="y" name="Distance" unit="km" tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} label={{ value: "Distance (km)", angle: -90, position: "insideLeft", offset: 14, fontSize: 11, fill: "#8b9493" }} />
          <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "rgba(4,57,59,0.2)" }} content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0]?.payload;
            if (!d) return null;
            return (
              <div style={{ background: "#fff", border: "1px solid #e0e4e3", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                <strong style={{ display: "block", color: "#04393b", marginBottom: 2 }}>{d.name}</strong>
                <span style={{ color: "#667573" }}>{d.x}m elevation · {d.y}km</span>
              </div>
            );
          }} />
          <ReferenceLine y={avgDistance} stroke="var(--color-accent)" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: `avg ${avgDistance}km`, position: "insideTopRight", fontSize: 10, fontWeight: 700, fill: "var(--color-accent)" }} />
          <ReferenceLine x={avgHeight}   stroke="var(--color-teal)"   strokeDasharray="5 4" strokeWidth={1.5} label={{ value: `avg ${avgHeight}m`,   position: "insideTopLeft",  fontSize: 10, fontWeight: 700, fill: "var(--color-teal)" }} />
          <Scatter data={data} fill="var(--color-teal)" fillOpacity={0.75} stroke="var(--color-teal-deep)" strokeWidth={1} r={6} />
        </ScatterChart>
      </ResponsiveContainer>
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-soft)", marginTop: "0.5rem" }}>
        Each dot is one completed ascent. Dashed line shows your average distance. Hover for details.
      </p>
    </article>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const TIER_COLORS = { Bronze: "#c97c3a", Silver: "#8b9493", Gold: "var(--color-accent)" };

function mountainBelongsToCollection(mountain, collectionSlug) {
  return (
    mountain.collection_memberships?.some((m) => m.collection?.slug === collectionSlug) ||
    mountain.collection?.slug === collectionSlug
  );
}

function getMountainCollectionNames(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships.map((m) => m.collection?.name).filter(Boolean).join(" / ");
  }
  return mountain.collection?.name || "Unlisted";
}

function getLogCollectionNames(log) {
  return log.mountain_detail ? getMountainCollectionNames(log.mountain_detail) : "Unlisted";
}

function formatDate(dateValue) {
  if (!dateValue) return "No date";
  return new Date(dateValue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ElevationRidge({ percent }) {
  const h = 120, w = 280;
  const fillH = Math.round(h * (percent / 100));
  const ridge = `M0,${h} L0,${h * 0.7} L28,${h * 0.62} L50,${h * 0.48} L66,${h * 0.52} L82,${h * 0.38} L96,${h * 0.42} L112,${h * 0.22} L124,${h * 0.28} L136,${h * 0.14} L148,${h * 0.20} L158,${h * 0.12} L170,${h * 0.18} L184,${h * 0.26} L198,${h * 0.20} L216,${h * 0.32} L232,${h * 0.26} L250,${h * 0.38} L268,${h * 0.34} L280,${h * 0.40} L${w},${h * 0.44} L${w},${h} Z`;
  const clipId = "elev-clip";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="elevation-ridge-svg" aria-hidden="true">
      <defs>
        <clipPath id={clipId}><rect x="0" y={h - fillH} width={w} height={fillH} /></clipPath>
      </defs>
      <path d={ridge} fill="rgba(4,57,59,0.18)" />
      <path d={ridge} fill="url(#elev-grad)" clipPath={`url(#${clipId})`} />
      <defs>
        <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-teal)" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <line x1="0" y1={h - fillH} x2={w} y2={h - fillH} stroke="rgba(208,170,98,0.6)" strokeWidth="1" strokeDasharray="4 3" />
      <text x={w - 4} y={h - fillH - 6} textAnchor="end" fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="700" fill="rgba(208,170,98,0.85)" letterSpacing="0.06em">{percent}%</text>
    </svg>
  );
}

function DashboardGreeting({ userName, isDemo }) {
  const possessive = userName ? `${userName}'s` : "Explorer's";
  return (
    <div className="dashboard-greeting">
      <div className="container">
        <div className="dashboard-greeting__inner">
          <div className="dashboard-greeting__text">
            <p className="section-kicker">
              <span className="kicker-line" />
              {isDemo ? "Preview mode" : "Welcome back"}
            </p>
            <h2 className="dashboard-greeting__name">
              <span className="dashboard-greeting__possessive">{possessive}</span>
              <span className="dashboard-greeting__label"> mountain stats</span>
            </h2>
            {isDemo && (
              <p className="dashboard-greeting__demo-note">
                These are example stats. <Link to="/account">Sign in</Link> to see your real progress.
              </p>
            )}
          </div>
          <div className="dashboard-greeting__meta">
            <TbMountain size={48} strokeWidth={0.8} className="dashboard-greeting__icon" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [mountains,   setMountains]   = useState([]);
  const [collections, setCollections] = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [routeLogs,   setRouteLogs]   = useState([]);
  const [user,        setUser]        = useState(null);
  const [status,      setStatus]      = useState("loading");
  const loaded  = status === "success" || status === "demo";
  const isDemo  = status === "demo";
  const [showAllLogs,     setShowAllLogs]     = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);
  const MAX_VISIBLE = 5;
  const [exporting, setExporting] = useState(null);

  async function handleExport(format) {
    try { setExporting(format); await exportLogs(format); }
    catch (e) { console.error(e); }
    finally { setExporting(null); }
  }

  useEffect(() => {
    async function loadDashboard() {
      let currentUser = null;
      try {
        const userData = await getCurrentUser();
        currentUser = userData.user;
        setUser(currentUser);
      } catch { setStatus("demo"); return; }

      // getCurrentUser() succeeds (200) even when nobody's logged in — it
      // just returns { user: null }. That's not an error, so the catch
      // above never fires for it. Treat a confirmed logged-out visitor
      // the same as a network failure: show the demo preview instead of
      // calling endpoints that require auth and would just 403.
      if (!currentUser) { setStatus("demo"); return; }

      try {
        const [mountainData, collectionData, logData] = await Promise.all([
          getMountains(), getCollections(), getProgressLogs(),
        ]);
        setMountains(Array.isArray(mountainData) ? mountainData : mountainData.results || []);
        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setLogs(Array.isArray(logData) ? logData : logData.results || []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setLogs([]); setMountains([]); setCollections([]);
        setStatus("success");
      }

      try {
        const routeData = await getRouteLogs();
        setRouteLogs(Array.isArray(routeData) ? routeData : []);
      } catch { /* no routes yet */ }
    }
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    if (status === "demo") return generateDemoStats();

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
  }, [collections, logs, mountains, status, routeLogs]);

  // Achievement notifications — fires toasts for newly earned badges
  const { current: currentBadge, dismiss: dismissBadge } = useAchievementNotifications(
    stats.achievements,
    isDemo,
  );

  const userName      = user?.username || user?.user?.username || user?.first_name || null;
  const showBottomRow = (stats.mostSummited?.length > 0) || (stats.scatterData?.length > 0);

  const activityFeed = useMemo(() => {
    const logEntries   = (stats.recentLogs   || []).map((l) => ({ type: "log",   date: l.completed_date || l.updated_at, data: l }));
    const routeEntries = (stats.recentRoutes || []).map((r) => ({ type: "route", date: r.completed_date,                data: r }));
    const all = [...logEntries, ...routeEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
    return showAllLogs ? all : all.slice(0, MAX_VISIBLE);
  }, [stats.recentLogs, stats.recentRoutes, showAllLogs]);

  const totalActivityCount = (stats.recentLogs?.length || 0) + (stats.recentRoutes?.length || 0);

  return (
    <main className="dashboard-page">
      {/* Achievement toast notification */}
      <AchievementNotification badge={currentBadge} onDismiss={dismissBadge} />

      <section className="section section-dark dashboard-hero">
        <div className="container">
          <p className="section-kicker"><span className="kicker-line" />Dashboard</p>
          <h1 className="page-hero__h1">
            <span className="page-hero__h1-top">Your mountain record,</span>
            <span className="page-hero__h1-bottom">Progress.</span>
          </h1>
          <p>Track completed summits, planned objectives, distance logged and collection progress across the UK.</p>
        </div>
      </section>

      {(status === "success" || status === "demo") && (
        <DashboardGreeting userName={userName} isDemo={isDemo} />
      )}

      <section className="section section-light">
        <div className="container">
          {status === "loading" && (
            <>
              <div className="dashboard-stat-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dashboard-stat-card">
                    <div className="skeleton-line" style={{ width: 40, height: 40, borderRadius: 10, marginBottom: 12 }} />
                    <div className="skeleton-line skeleton-line--short" />
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line skeleton-line--short" style={{ width: "40%" }} />
                  </div>
                ))}
              </div>
              <div className="dashboard-journey-grid" style={{ marginTop: "var(--space-xxl)" }}>
                <div className="dashboard-journey-card skeleton-card" style={{ minHeight: 180 }} />
                <div className="dashboard-journey-card skeleton-card" style={{ minHeight: 180 }} />
              </div>
            </>
          )}

          {(status === "success" || status === "demo") && (
            <>
              {isDemo && (
                <div className="dashboard-demo-banner">
                  <TbUser size={16} strokeWidth={2} />
                  <span>You're viewing a preview with example data. <Link to="/account">Sign in</Link> to track your real mountain progress.</span>
                </div>
              )}

              <div className="dashboard-stat-grid">
                <StatCard label="Completed"       rawValue={stats.completed}                        sub="summits logged"           loaded={loaded} />
                <StatCard label="Planned"         rawValue={stats.planned}                          sub="future objectives"        loaded={loaded} />
                {stats.routeCount > 0 && (
                  <StatCard label="Routes logged" rawValue={stats.routeCount}                       sub="multi-mountain days"      loaded={loaded} />
                )}
                <StatCard label="Distance"        rawValue={`${stats.totalDistance.toFixed(1)}km`}  sub="personally logged"        loaded={loaded} />
                <StatCard label="Height total"    rawValue={`${Math.round(stats.totalHeight)}m`}    sub="summit height completed"  loaded={loaded} />
                <StatCard label="Steps"           rawValue={stats.totalSteps}                       sub="steps logged"             loaded={loaded} />
                <StatCard label="Flights climbed" rawValue={stats.totalFlightsClimbed}              sub="flights recorded"         loaded={loaded} />
              </div>

              <PersonalBests personalBests={stats.personalBests} />

              <div className="dashboard-journey-grid">
                <article className="dashboard-journey-card dashboard-next-card">
                  <p className="section-kicker">Next objective</p>
                  {stats.nextObjective ? (
                    <>
                      <h3>{stats.nextObjective.mountain_detail?.name}</h3>
                      <p>{getLogCollectionNames(stats.nextObjective)} / {stats.nextObjective.mountain_detail?.region?.name}</p>
                      <div className="dashboard-journey-meta">
                        <span>{stats.nextObjective.mountain_detail?.height_m}m</span>
                        <span>{stats.nextObjective.route_taken || "Route not set"}</span>
                      </div>
                      {!isDemo && <Link to={`/mountains/${stats.nextObjective.mountain_detail?.slug}`}>Open mountain</Link>}
                    </>
                  ) : (
                    <>
                      <h3>No objective planned yet</h3>
                      <p>Open a mountain and mark it as planned.</p>
                      {!isDemo && <Link to="/mountains">Explore mountains</Link>}
                    </>
                  )}
                </article>
                <article className="dashboard-journey-card dashboard-elevation-card">
                  <p className="section-kicker">Elevation climbed</p>
                  <h3>{Math.round(stats.totalHeight).toLocaleString()}m</h3>
                  <ElevationRidge percent={stats.elevationPercent} />
                  <p>{stats.elevationPercent}% of a 50,000m milestone</p>
                </article>
              </div>

              {stats.upcomingPlanned?.length > 0 && (
                <ComingUpPanel upcomingPlanned={stats.upcomingPlanned} isDemo={isDemo} />
              )}

              <div className="dashboard-chart-grid">
                <article className="dashboard-chart-card dashboard-chart-card--status">
                  <div><p className="section-kicker">Overview</p><h3>Progress status</h3></div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={stats.statusChartData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={5} stroke="white" strokeWidth={4}>
                        {stats.statusChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.name === "Completed" ? CHART_COLORS.completed : entry.name === "Planned" ? CHART_COLORS.planned : CHART_COLORS.remaining} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="dashboard-chart-center-value">{stats.completed}</text>
                      <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="dashboard-chart-center-label">completed</text>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="dashboard-chart-legend">
                    <span><i className="legend-dot legend-dot--completed" />Completed</span>
                    <span><i className="legend-dot legend-dot--planned" />Planned</span>
                    <span><i className="legend-dot legend-dot--not-started" />Remaining</span>
                  </div>
                </article>
                <article className="dashboard-chart-card dashboard-chart-card--collections">
                  <div><p className="section-kicker">Collections</p><h3>Completed vs remaining</h3></div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.collectionChartData} barCategoryGap="24%">
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,57,59,0.12)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="completed" stackId="a" fill={CHART_COLORS.completed} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="remaining"  stackId="a" fill={CHART_COLORS.remaining}  radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="dashboard-chart-legend">
                    <span><i className="legend-dot legend-dot--completed" />Completed</span>
                    <span><i className="legend-dot legend-dot--not-started" />Remaining</span>
                  </div>
                </article>
                <article className="dashboard-chart-card dashboard-chart-card--timeline">
                  <div><p className="section-kicker">Timeline</p><h3>Mountains completed over time</h3></div>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.completionTimelineData}>
                      <defs>
                        <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="var(--color-teal)" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,57,59,0.12)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="completed" stroke={CHART_COLORS.completed} strokeWidth={3} fill="url(#timelineGrad)" dot={{ r: 5, fill: "var(--color-teal)", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 7 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </article>
                {showBottomRow && (
                  <div className="dashboard-chart-row">
                    {stats.mostSummited?.length > 0 && <MostSummitedChart data={stats.mostSummited} />}
                    {stats.scatterData?.length > 0    && <HeightVsDistanceChart data={stats.scatterData} />}
                  </div>
                )}
              </div>

              <div className="dashboard-story-grid">
                <article className="dashboard-story-card">
                  <p className="section-kicker">Recent activity</p>
                  <h3>Latest mountain logs</h3>
                  <div className="dashboard-timeline">
                    {activityFeed.length === 0 && <p>No recent activity yet.</p>}
                    {activityFeed.map((item) => {
                      if (item.type === "route") {
                        const route = item.data;
                        return (
                          <Link to="/journal" className="dashboard-timeline-item dashboard-timeline-item--route" key={`route-${route.id}`}>
                            <span className="dashboard-timeline-route-icon"><TbRoute size={11} strokeWidth={2.5} /></span>
                            <div>
                              <strong>{route.name}</strong>
                              <small>Route · {route.mountains_count} summits · {formatDate(route.completed_date)}</small>
                            </div>
                          </Link>
                        );
                      }
                      const log = item.data;
                      return (
                        <Link to={log.mountain_detail?.slug ? `/mountains/${log.mountain_detail.slug}` : "#"} className="dashboard-timeline-item" key={log.id}>
                          <span>{log.status === "completed" ? "✓" : "○"}</span>
                          <div>
                            <strong>
                              {log.mountain_detail?.name}
                              {log.route_name && <span className="dashboard-timeline-route-badge">{log.route_name}</span>}
                            </strong>
                            <small>{log.status} / {formatDate(log.completed_date)}</small>
                          </div>
                        </Link>
                      );
                    })}
                    {totalActivityCount > MAX_VISIBLE && (
                      <button className="dashboard-show-more" onClick={() => setShowAllLogs(!showAllLogs)}>
                        {showAllLogs ? "Show less" : `Show ${totalActivityCount - MAX_VISIBLE} more`}
                      </button>
                    )}
                  </div>
                </article>
                <article className="dashboard-story-card">
                  <p className="section-kicker">Summit memories</p>
                  <h3>Recent photos</h3>
                  <div className="dashboard-photo-strip">
                    {stats.photoLogs.length === 0 && <p>{isDemo ? "Sign in to see your summit photos." : "No uploaded summit photos yet."}</p>}
                    {stats.photoLogs.map((log) => (
                      <Link to={`/mountains/${log.mountain_detail?.slug}`} key={log.id}>
                        <img src={log.uploaded_image} alt={log.mountain_detail?.name} />
                      </Link>
                    ))}
                  </div>
                </article>
              </div>

              {/* Activity heatmap */}
              {stats.heatmapLogs && <ActivityHeatmap logs={stats.heatmapLogs} />}

              {/* Personal stats in depth */}
              <PersonalStatsDepthPanel deepStats={stats.deepStats} isDemo={isDemo} />

              {/* Tiered achievements */}
              <div className="dashboard-achievement-panel">
                <div className="dashboard-achievement-summary">
                  <div>
                    <p className="section-kicker">Achievements</p>
                    <h2>Summit achievements</h2>
                  </div>
                  <div className="dashboard-achievement-score">
                    <strong>{stats.earnedBadgeCount} / {TOTAL_POSSIBLE_BADGES}</strong>
                    <span>badges earned</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${stats.achievementPercent}%` }} />
                  </div>
                  <p>{TOTAL_POSSIBLE_BADGES - stats.earnedBadgeCount} badges remaining</p>
                  <div className="achievement-tier-legend">
                    {["Bronze", "Silver", "Gold"].map((tier) => (
                      <span key={tier} className="achievement-tier-legend__item">
                        <i className="achievement-tier-dot achievement-tier-dot--earned" style={{ background: TIER_COLORS[tier] }} />
                        {tier}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="dashboard-achievement-list">
                  {stats.achievements.map((ach) => {
                    const AchIcon    = ach.icon || TbStar;
                    const badgeColor = ach.activeTier ? TIER_COLORS[ach.activeTier.label] : "rgba(127,181,179,0.12)";
                    const badgeFg    = ach.activeTier ? "#fff" : "var(--color-teal-deep)";
                    return (
                      <article key={ach.id} className={`dashboard-achievement-item${ach.activeTierIndex >= 0 ? " achieved" : ""}`}>
                        <div>
                          <div className="dashboard-achievement-item__header">
                            <h3>{ach.title}</h3>
                            <div className="achievement-tier-dots">
                              {ach.tiers.map((tier, i) => (
                                <span
                                  key={tier.label}
                                  className="achievement-tier-dot"
                                  style={{ background: i <= ach.activeTierIndex ? TIER_COLORS[tier.label] : "rgba(4,57,59,0.1)", border: i <= ach.activeTierIndex ? "none" : "1px solid rgba(4,57,59,0.15)" }}
                                  title={`${tier.label}: ${tier.target.toLocaleString()}`}
                                />
                              ))}
                            </div>
                          </div>
                          {ach.allComplete ? (
                            <p className="achievement-complete">All tiers complete! 🏆</p>
                          ) : (
                            <>
                              <p>{ach.nextTier?.description}</p>
                              <div className="progress-track" style={{ marginTop: "0.5rem" }}>
                                <span style={{ width: `${ach.percent}%` }} />
                              </div>
                            </>
                          )}
                          <small>
                            {ach.current.toLocaleString()}
                            {!ach.allComplete && ` / ${ach.nextTier?.target.toLocaleString()}`}
                            {ach.activeTier && (
                              <span className={`achievement-tier-label achievement-tier-label--${ach.activeTier.label.toLowerCase()}`}>{ach.activeTier.label}</span>
                            )}
                          </small>
                        </div>
                        <strong className="dashboard-achievement-badge" style={{ background: badgeColor, color: badgeFg }}>
                          <AchIcon size={16} strokeWidth={ach.activeTierIndex >= 0 ? 2.5 : 1.5} />
                        </strong>
                      </article>
                    );
                  })}
                </div>
              </div>

              <div className="dashboard-region-panel">
                <div>
                  <p className="section-kicker">UK progress</p>
                  <h2>Region completion</h2>
                  <p>See how your completed and planned summits are building across each mountain area.</p>
                </div>
                <div className="dashboard-region-grid">
                  {stats.regionStats.map((region) => (
                    <Link to={`/regions/${region.name.toLowerCase().replace(/ /g, "-")}`} className="dashboard-region-card" key={region.name}>
                      <div>
                        <p className="section-kicker">{region.name}</p>
                        <h3>{region.completed} / {region.total}</h3>
                        <span>{region.planned} planned</span>
                      </div>
                      <strong>{region.percent}%</strong>
                      <div className="progress-track"><span style={{ width: `${region.percent}%` }} /></div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="collection-progress-panel">
                <div>
                  <p className="section-kicker">Collection progress</p>
                  <h2>Progress by mountain list</h2>
                </div>
                <div className="collection-progress-list collection-progress-list--premium">
                  {stats.collectionStats.map((collection) => {
                    const remaining = Math.max(collection.total - collection.completed, 0);
                    return (
                      <Link to={`/collections/${collection.slug}`} className="collection-progress-card collection-progress-card--premium" key={collection.id}>
                        <div className="collection-progress-card__icon"><TbMountain size={20} strokeWidth={1.5} /></div>
                        <div className="collection-progress-card__main">
                          <p className="section-kicker">{collection.name}</p>
                          <h3>{collection.completed} / {collection.total}</h3>
                          <p>{remaining} remaining to complete this collection.</p>
                          <div className="progress-track"><span style={{ width: `${collection.percent}%` }} /></div>
                        </div>
                        <strong className="collection-progress-card__percent">{collection.percent}%</strong>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="my-progress-panel">
                <div>
                  <p className="section-kicker">My progress</p>
                  <h2>Saved mountain logs</h2>
                  <p>Review completed and planned mountains, then open each summit to update your route notes, date, distance or status.</p>
                  {!isDemo && (
                    <div className="dashboard-export-bar">
                      <p>Download your completed summits:</p>
                      <button onClick={() => handleExport("csv")} disabled={exporting === "csv"}>{exporting === "csv" ? "Exporting..." : "Export CSV"}</button>
                      <button onClick={() => handleExport("gpx")} disabled={exporting === "gpx"}>{exporting === "gpx" ? "Exporting..." : "Export GPX"}</button>
                    </div>
                  )}
                </div>
                <div className="my-progress-list">
                  {stats.recentLogs.length === 0 && <p>No mountain logs yet.</p>}
                  {stats.recentLogs.slice(0, showAllProgress ? undefined : MAX_VISIBLE).map((log) => (
                    <Link to={log.mountain_detail?.slug ? `/mountains/${log.mountain_detail.slug}` : "#"} className="my-progress-card" key={log.id}>
                      <div>
                        <p className="my-progress-card__status">{log.status}</p>
                        <h3>{log.mountain_detail?.name}</h3>
                        <p>{log.mountain_detail?.region?.name}</p>
                      </div>
                      <div className="my-progress-card__meta">
                        <span>{log.completed_date || "No date"}</span>
                        <span>{log.hike_distance_km || "—"}km</span>
                        <span className="my-progress-card__arrow">→</span>
                      </div>
                    </Link>
                  ))}
                  {stats.recentLogs.length > MAX_VISIBLE && (
                    <button className="dashboard-show-more" onClick={() => setShowAllProgress(!showAllProgress)}>
                      {showAllProgress ? "Show less" : `Show ${stats.recentLogs.length - MAX_VISIBLE} more`}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
