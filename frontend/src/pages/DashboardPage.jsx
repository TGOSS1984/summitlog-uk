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
import {
  buildHeatmapData,
  computeRealDashboardStats,
  buildTieredAchievements,
  countEarnedBadges,
  getLogCollectionNames,
  TIER_COLORS,
  TOTAL_POSSIBLE_BADGES,
} from "../components/dashboard/dashboardStats";
import { AchievementPanel, RegionProgressPanel, CollectionProgressPanel } from "../components/dashboard/DashboardPanels";

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
  "Total progress":  { icon: TbTargetArrow, color: "var(--color-teal)" },
  "% Completed":     { icon: TbTrophy,      color: "var(--color-accent)" },
};

// ── Heatmap data builder ─────────────────────────────────────────────────────

// ── Deep stats computation ───────────────────────────────────────────────────
// Computes streak, best month, best year, top region, year breakdown.

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

export function PersonalStatsDepthPanel({ deepStats, isDemo }) {
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

export function StatCard({ label, rawValue, sub, loaded }) {
  const meta = STAT_ICONS[label] || { icon: TbStar, color: "var(--color-teal)" };
  const Icon = meta.icon;
  const isFraction = typeof rawValue === "string" && rawValue.includes("/");
  const numericTarget = parseFloat(String(rawValue).replace(/[^0-9.]/g, "")) || 0;
  const suffix  = String(rawValue).replace(/[0-9.,]/g, "").trim();
  const counted = useCountUp(numericTarget, 1400, loaded && !isFraction);
  const display = isFraction
    ? rawValue
    : numericTarget > 0
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

export function PersonalBests({ personalBests }) {
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

export function ComingUpPanel({ upcomingPlanned, isDemo }) {
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

export function ActivityHeatmap({ logs }) {
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
export function MostSummitedChart({ data }) {
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
export function HeightVsDistanceChart({ data }) {
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

function formatDate(dateValue) {
  if (!dateValue) return "No date";
  return new Date(dateValue).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function ElevationRidge({ percent }) {
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
    return computeRealDashboardStats({ mountains, collections, logs, routeLogs });
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
                <StatCard
                  label="Total progress"
                  rawValue={`${stats.completed} / ${stats.totalVisible}`}
                  sub="completed of all UK mountains"
                  loaded={loaded}
                />
                <StatCard
                  label="% Completed"
                  rawValue={`${stats.totalVisible ? Math.round((stats.completed / stats.totalVisible) * 100) : 0}%`}
                  sub="of all UK mountains tracked"
                  loaded={loaded}
                />
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
              <AchievementPanel
                achievements={stats.achievements}
                earnedBadgeCount={stats.earnedBadgeCount}
                achievementPercent={stats.achievementPercent}
              />

              <RegionProgressPanel regionStats={stats.regionStats} />

              <CollectionProgressPanel collectionStats={stats.collectionStats} />

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