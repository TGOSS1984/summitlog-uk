import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart,
} from "recharts";
import {
  TbMountain, TbRoute, TbRuler, TbStairs, TbWalk,
  TbTrophy, TbFlag, TbMap2, TbStar, TbFlame,
  TbCheck, TbCircle, TbBolt, TbTargetArrow, TbUser,
  TbCalendar, TbArrowUp, TbStepInto,
} from "react-icons/tb";

import { getCollections, getMountains, getProgressLogs, getCurrentUser, exportLogs } from "../lib/api";



const DASHBOARD_COLLECTIONS = [
  { name: "Wainwrights", slug: "wainwrights", expectedTotal: 214 },
  { name: "Munros", slug: "munros", expectedTotal: 282 },
  { name: "Nuttalls", slug: "nuttalls", expectedTotal: 443 },
];

const CHART_COLORS = {
  completed: "var(--color-teal)",
  planned: "var(--color-accent)",
  remaining: "#d9dedc",
  text: "var(--color-teal-deep)",
};

const STAT_ICONS = {
  "Completed":       { icon: TbMountain,    color: "var(--color-teal-deep)" },
  "Planned":         { icon: TbFlag,         color: "var(--color-accent)" },
  "Distance":        { icon: TbRoute,        color: "var(--color-teal)" },
  "Height total":    { icon: TbRuler,        color: "var(--color-accent)" },
  "Steps":           { icon: TbWalk,         color: "var(--color-teal)" },
  "Flights climbed": { icon: TbStairs,       color: "var(--color-teal-deep)" },
};

const ACHIEVEMENT_ICONS = {
  "First Summit":       TbMountain,
  "Wainwright Starter": TbFlag,
  "Mountain Regular":   TbTrophy,
  "Distance Walker":    TbRoute,
  "Step Collector":     TbWalk,
  "Stairway Summit":    TbStairs,
  "High Climber":       TbTargetArrow,
};

// Seeded random number generator — same seed = same numbers each session
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate plausible-looking demo stats
function generateDemoStats() {
  const seed = Math.floor(Date.now() / 60000);
  const rng = seededRandom(seed);

  const completed = Math.floor(rng() * 60) + 8;
  const planned = Math.floor(rng() * 20) + 3;
  const totalDistance = Math.floor(rng() * 300) + 50;
  const totalHeight = Math.floor(rng() * 30000) + 5000;
  const totalSteps = Math.floor(rng() * 400000) + 50000;
  const totalFlightsClimbed = Math.floor(rng() * 800) + 100;

  const wainwrightsCompleted = Math.floor(rng() * 80) + 5;
  const munrosCompleted = Math.floor(rng() * 60) + 3;
  const nuttallsCompleted = Math.floor(rng() * 50) + 2;

  const collectionStats = [
    { id: "wainwrights", name: "Wainwrights", slug: "wainwrights", completed: wainwrightsCompleted, total: 214, percent: Math.round((wainwrightsCompleted / 214) * 100) },
    { id: "munros",      name: "Munros",      slug: "munros",      completed: munrosCompleted,      total: 282, percent: Math.round((munrosCompleted / 282) * 100) },
    { id: "nuttalls",    name: "Nuttalls",    slug: "nuttalls",    completed: nuttallsCompleted,    total: 443, percent: Math.round((nuttallsCompleted / 443) * 100) },
  ];

  const statusChartData = [
    { name: "Completed", value: completed },
    { name: "Planned",   value: planned },
    { name: "Remaining", value: 800 - completed - planned },
  ];

  const collectionChartData = collectionStats.map((c) => ({
    name: c.name,
    completed: c.completed,
    remaining: Math.max(c.total - c.completed, 0),
  }));

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const completionTimelineData = months.slice(0, 8).map((month) => ({
    month,
    completed: Math.floor(rng() * 8) + 1,
  }));

  const elevationPercent = Math.min(Math.round((totalHeight / 50000) * 100), 100);

  const achievements = [
    { title: "First Summit",       description: "Complete your first mountain log.",       target: 1,      current: completed },
    { title: "Wainwright Starter", description: "Complete 5 Wainwrights.",                target: 5,      current: wainwrightsCompleted },
    { title: "Mountain Regular",   description: "Complete 10 mountains.",                 target: 10,     current: completed },
    { title: "Distance Walker",    description: "Log 50km of routes.",                   target: 50,     current: totalDistance },
    { title: "Step Collector",     description: "Log 100,000 steps.",                    target: 100000, current: totalSteps },
    { title: "Stairway Summit",    description: "Log 500 flights climbed.",              target: 500,    current: totalFlightsClimbed },
    { title: "High Climber",       description: "Reach 5000m total elevation.",          target: 5000,   current: totalHeight },
  ];

  const achievedBadges = achievements.filter((a) => a.current >= a.target);
  const achievementPercent = Math.round((achievedBadges.length / achievements.length) * 100);

  const regionStats = [
    { name: "Lake District", completed: Math.floor(rng() * 30) + 2, planned: Math.floor(rng() * 8), total: 214 },
    { name: "Scotland",      completed: Math.floor(rng() * 25) + 1, planned: Math.floor(rng() * 10), total: 282 },
    { name: "Wales",         completed: Math.floor(rng() * 20) + 1, planned: Math.floor(rng() * 6), total: 120 },
    { name: "England",       completed: Math.floor(rng() * 15) + 1, planned: Math.floor(rng() * 5), total: 184 },
  ].map((r) => ({ ...r, percent: Math.round((r.completed / r.total) * 100) }));

  const demoLogs = [
    { id: 1, mountain_detail: { name: "Scafell Pike", slug: "scafell-pike", height_m: 978, region: { name: "Lake District" } }, status: "completed", completed_date: "2024-08-14", hike_distance_km: 12.4, steps: 24000, hike_duration_hours: 6.5 },
    { id: 2, mountain_detail: { name: "Helvellyn",    slug: "helvellyn",    height_m: 950, region: { name: "Lake District" } }, status: "completed", completed_date: "2024-07-22", hike_distance_km: 9.8,  steps: 19500, hike_duration_hours: 5.2 },
    { id: 3, mountain_detail: { name: "Ben Nevis",    slug: "ben-nevis",    height_m: 1345, region: { name: "Scotland" } },     status: "planned",   completed_date: null,         hike_distance_km: null, steps: null, hike_duration_hours: null },
    { id: 4, mountain_detail: { name: "Snowdon",      slug: "snowdon",      height_m: 1085, region: { name: "Wales" } },        status: "completed", completed_date: "2024-06-10", hike_distance_km: 8.2,  steps: 16800, hike_duration_hours: 4.8 },
    { id: 5, mountain_detail: { name: "Skiddaw",      slug: "skiddaw",      height_m: 931,  region: { name: "Lake District" } }, status: "completed", completed_date: "2024-05-30", hike_distance_km: 7.6,  steps: 15200, hike_duration_hours: 4.1 },
  ];

  // Demo personal bests
  const personalBests = {
    longestHike:   { value: "12.4km", label: "Longest single hike",    mountain: "Scafell Pike",  date: "14 Aug 2024" },
    highestPeak:   { value: "978m",   label: "Highest peak summited",   mountain: "Scafell Pike",  date: "14 Aug 2024" },
    mostSteps:     { value: "24,000", label: "Most steps in one day",   mountain: "Scafell Pike",  date: "14 Aug 2024" },
    longestHours:  { value: "6.5hrs", label: "Longest hike duration",   mountain: "Scafell Pike",  date: "14 Aug 2024" },
    mostRecent:    { value: "14 Aug 2024", label: "Most recent summit", mountain: "Scafell Pike",  date: null },
    firstSummit:   { value: "30 May 2024", label: "First summit logged", mountain: "Skiddaw",      date: null },
  };

  return {
    completed, planned, totalVisible: 800, totalDistance, totalHeight, totalSteps, totalFlightsClimbed,
    collectionStats, statusChartData, collectionChartData, completionTimelineData,
    recentLogs: demoLogs, nextObjective: demoLogs.find((l) => l.status === "planned") || null,
    photoLogs: [], elevationPercent, achievements, achievedBadges, achievementPercent,
    regionStats, personalBests,
  };
}

// Compute personal bests from real logs + mountains
function computePersonalBests(logs, mountains) {
  const completedLogs = logs.filter((l) => l.status === "completed");

  if (completedLogs.length === 0) return null;

  // Longest hike by distance
  const longestHikeLog = [...completedLogs]
    .filter((l) => l.hike_distance_km)
    .sort((a, b) => Number(b.hike_distance_km) - Number(a.hike_distance_km))[0];

  // Highest peak — match log to mountain height
  const completedWithHeight = completedLogs.map((l) => {
    const mountain = mountains.find((m) => m.id === l.mountain);
    return { ...l, height_m: mountain?.height_m || l.mountain_detail?.height_m || 0, mountainName: mountain?.name || l.mountain_detail?.name };
  }).filter((l) => l.height_m > 0);
  const highestPeakLog = [...completedWithHeight].sort((a, b) => b.height_m - a.height_m)[0];

  // Most steps
  const mostStepsLog = [...completedLogs]
    .filter((l) => l.steps)
    .sort((a, b) => Number(b.steps) - Number(a.steps))[0];

  // Longest duration
  const longestDurationLog = [...completedLogs]
    .filter((l) => l.hike_duration_hours)
    .sort((a, b) => Number(b.hike_duration_hours) - Number(a.hike_duration_hours))[0];

  // Most recent summit
  const mostRecentLog = [...completedLogs]
    .filter((l) => l.completed_date)
    .sort((a, b) => new Date(b.completed_date) - new Date(a.completed_date))[0];

  // First summit ever
  const firstSummitLog = [...completedLogs]
    .filter((l) => l.completed_date)
    .sort((a, b) => new Date(a.completed_date) - new Date(b.completed_date))[0];

  function fmtDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  return {
    longestHike:  longestHikeLog  ? { value: `${Number(longestHikeLog.hike_distance_km).toFixed(1)}km`,  label: "Longest single hike",    mountain: longestHikeLog.mountain_detail?.name  || "—", date: fmtDate(longestHikeLog.completed_date) }  : null,
    highestPeak:  highestPeakLog  ? { value: `${highestPeakLog.height_m}m`,                              label: "Highest peak summited",   mountain: highestPeakLog.mountainName           || "—", date: fmtDate(highestPeakLog.completed_date) }  : null,
    mostSteps:    mostStepsLog    ? { value: Number(mostStepsLog.steps).toLocaleString(),                 label: "Most steps in one day",   mountain: mostStepsLog.mountain_detail?.name    || "—", date: fmtDate(mostStepsLog.completed_date) }    : null,
    longestHours: longestDurationLog ? { value: `${Number(longestDurationLog.hike_duration_hours)}hrs`,  label: "Longest hike duration",   mountain: longestDurationLog.mountain_detail?.name || "—", date: fmtDate(longestDurationLog.completed_date) } : null,
    mostRecent:   mostRecentLog   ? { value: fmtDate(mostRecentLog.completed_date),                      label: "Most recent summit",      mountain: mostRecentLog.mountain_detail?.name   || "—", date: null }                                     : null,
    firstSummit:  firstSummitLog  ? { value: fmtDate(firstSummitLog.completed_date),                     label: "First summit logged",     mountain: firstSummitLog.mountain_detail?.name  || "—", date: null }                                     : null,
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
      const eased = 1 - Math.pow(1 - progress, 3);
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
  const suffix = String(rawValue).replace(/[0-9.,]/g, "").trim();
  const counted = useCountUp(numericTarget, 1400, loaded);
  const display = numericTarget > 0
    ? (Number.isInteger(numericTarget) ? counted.toLocaleString() : counted.toFixed(1)) + (suffix ? suffix : "")
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
            <div className="dashboard-pb-card__icon" style={{ color }}>
              <Icon size={20} strokeWidth={1.5} />
            </div>
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
  const [mountains, setMountains] = useState([]);
  const [collections, setCollections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const loaded = status === "success" || status === "demo";
  const isDemo = status === "demo";
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showAllProgress, setShowAllProgress] = useState(false);
  const MAX_VISIBLE = 5;

  const [exporting, setExporting] = useState(null);

  async function handleExport(format) {
    try {
      setExporting(format);
      await exportLogs(format);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      try {
        let currentUser = null;
        try {
          const userData = await getCurrentUser();
          currentUser = userData;
          setUser(userData.user || userData);
        } catch {
          setStatus("demo");
          return;
        }

        const [mountainData, collectionData, logData] = await Promise.all([
          getMountains(), getCollections(), getProgressLogs(),
        ]);
        setMountains(Array.isArray(mountainData) ? mountainData : mountainData.results || []);
        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setLogs(Array.isArray(logData) ? logData : logData.results || []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("demo");
      }
    }
    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    if (status === "demo") return generateDemoStats();

    const completedLogs = logs.filter((log) => log.status === "completed");
    const plannedLogs = logs.filter((log) => log.status === "planned");
    const completedMountainIds = new Set(completedLogs.map((log) => log.mountain));
    const loggedMountainIds = new Set(logs.map((log) => log.mountain));

    const totalDistance = completedLogs.reduce((t, l) => t + Number(l.hike_distance_km || 0), 0);
    const totalHeight = mountains.filter((m) => completedMountainIds.has(m.id))
      .reduce((t, m) => t + Number(m.height_m || 0), 0);
    const totalSteps = completedLogs.reduce((t, l) => t + Number(l.steps || 0), 0);
    const totalFlightsClimbed = completedLogs.reduce((t, l) => t + Number(l.flights_climbed || 0), 0);

    const collectionStats = DASHBOARD_COLLECTIONS.map((dc) => {
      const apiCol = collections.find((c) => c.slug === dc.slug);
      const colMountains = mountains.filter((m) => mountainBelongsToCollection(m, dc.slug));
      const completedCount = colMountains.filter((m) => completedMountainIds.has(m.id)).length;
      const totalCount = apiCol?.expected_total || dc.expectedTotal || colMountains.length || 0;
      return { id: apiCol?.id || dc.slug, name: dc.name, slug: dc.slug, completed: completedCount, total: totalCount, percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0 };
    });

    const statusChartData = [
      { name: "Completed", value: completedLogs.length },
      { name: "Planned",   value: plannedLogs.length },
      { name: "Remaining", value: Math.max(mountains.length - loggedMountainIds.size, 0) },
    ];

    const collectionChartData = collectionStats.map((c) => ({ name: c.name, completed: c.completed, remaining: Math.max(c.total - c.completed, 0) }));

    const monthlyCompletionData = completedLogs.filter((l) => l.completed_date)
      .reduce((months, l) => {
        const key = new Date(l.completed_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
        months[key] = (months[key] || 0) + 1;
        return months;
      }, {});
    const completionTimelineData = Object.entries(monthlyCompletionData).map(([month, completed]) => ({ month, completed }));

    const recentLogs = [...logs].sort((a, b) => new Date(b.completed_date || b.updated_at || b.created_at) - new Date(a.completed_date || a.updated_at || a.created_at)).slice(0, 4);
    const nextObjective = plannedLogs[0] || null;
    const photoLogs = logs.filter((l) => l.uploaded_image).slice(0, 4);
    const elevationPercent = Math.min(Math.round((totalHeight / 50000) * 100), 100);

    const achievements = [
      { title: "First Summit",       description: "Complete your first mountain log.",          target: 1,      current: completedLogs.length },
      { title: "Wainwright Starter", description: "Complete 5 Wainwrights.",                   target: 5,      current: collectionStats.find((i) => i.slug === "wainwrights")?.completed || 0 },
      { title: "Mountain Regular",   description: "Complete 10 mountains.",                    target: 10,     current: completedLogs.length },
      { title: "Distance Walker",    description: "Log 50km of routes.",                      target: 50,     current: totalDistance },
      { title: "Step Collector",     description: "Log 100,000 steps across completed routes.", target: 100000, current: totalSteps },
      { title: "Stairway Summit",    description: "Log 500 flights climbed.",                 target: 500,    current: totalFlightsClimbed },
      { title: "High Climber",       description: "Reach 5000m total elevation.",             target: 5000,   current: totalHeight },
    ];

    const achievedBadges = achievements.filter((a) => a.current >= a.target);
    const achievementPercent = achievements.length > 0 ? Math.round((achievedBadges.length / achievements.length) * 100) : 0;

    const regionStats = ["Lake District", "Scotland", "Wales", "England"].map((regionName) => {
      const regionMountains = mountains.filter((m) => m.region?.name === regionName);
      const completed = regionMountains.filter((m) => completedMountainIds.has(m.id)).length;
      const planned = regionMountains.filter((m) => plannedLogs.some((l) => l.mountain === m.id)).length;
      const total = regionMountains.length;
      return { name: regionName, completed, planned, total, percent: total ? Math.round((completed / total) * 100) : 0 };
    });

    // Compute personal bests from real data
    const personalBests = computePersonalBests(logs, mountains);

    return { completed: completedLogs.length, planned: plannedLogs.length, totalVisible: mountains.length, totalDistance, totalHeight, totalSteps, totalFlightsClimbed, collectionStats, statusChartData, collectionChartData, recentLogs, nextObjective, photoLogs, elevationPercent, achievements, achievedBadges, achievementPercent, regionStats, completionTimelineData, personalBests };
  }, [collections, logs, mountains, status]);

  const userName = user?.username || user?.user?.username || user?.first_name || null;

  return (
    <main className="dashboard-page">
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
          {status === "loading" && <p>Loading dashboard...</p>}

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
                <StatCard label="Distance"        rawValue={`${stats.totalDistance.toFixed(1)}km`}  sub="personally logged"        loaded={loaded} />
                <StatCard label="Height total"    rawValue={`${Math.round(stats.totalHeight)}m`}    sub="summit height completed"  loaded={loaded} />
                <StatCard label="Steps"           rawValue={stats.totalSteps}                       sub="steps logged"             loaded={loaded} />
                <StatCard label="Flights climbed" rawValue={stats.totalFlightsClimbed}              sub="flights recorded"         loaded={loaded} />
              </div>

              {/* Personal bests — only shown when there's real data or demo */}
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
                    <LineChart data={stats.completionTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(4,57,59,0.12)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#243b3a", fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667573" }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="completed" stroke={CHART_COLORS.completed} strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </article>
              </div>

              <div className="dashboard-story-grid">
                <article className="dashboard-story-card">
                  <p className="section-kicker">Recent activity</p>
                  <h3>Latest mountain logs</h3>
                  <div className="dashboard-timeline">
                    {stats.recentLogs.length === 0 && <p>No recent activity yet.</p>}
                    {stats.recentLogs.slice(0, showAllLogs ? undefined : MAX_VISIBLE).map((log) => (
                      <div className="dashboard-timeline-item" key={log.id}>
                        <span>{log.status === "completed" ? "✓" : "○"}</span>
                        <div>
                          <strong>{log.mountain_detail?.name}</strong>
                          <small>{log.status} / {formatDate(log.completed_date)}</small>
                        </div>
                      </div>
                    ))}
                    {stats.recentLogs.length > MAX_VISIBLE && (
                      <button className="dashboard-show-more" onClick={() => setShowAllLogs(!showAllLogs)}>
                        {showAllLogs ? "Show less" : `Show ${stats.recentLogs.length - MAX_VISIBLE} more`}
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

              <div className="dashboard-achievement-panel">
                <div className="dashboard-achievement-summary">
                  <div>
                    <p className="section-kicker">Achievements</p>
                    <h2>Summit achievements</h2>
                  </div>
                  <div className="dashboard-achievement-score">
                    <strong>{stats.achievedBadges.length} / {stats.achievements.length}</strong>
                    <span>achieved</span>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${stats.achievementPercent}%` }} />
                  </div>
                  <p>{stats.achievements.length - stats.achievedBadges.length} achievements remaining</p>
                </div>
                <div className="dashboard-achievement-list">
                  {stats.achievements.map((achievement) => {
                    const achieved = achievement.current >= achievement.target;
                    const percent = Math.min(Math.round((achievement.current / achievement.target) * 100), 100);
                    const AchIcon = ACHIEVEMENT_ICONS[achievement.title] || TbStar;
                    return (
                      <article key={achievement.title} className={achieved ? "dashboard-achievement-item achieved" : "dashboard-achievement-item"}>
                        <div>
                          <h3>{achievement.title}</h3>
                          <p>{achievement.description}</p>
                          <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
                          <small>{Math.round(achievement.current)} / {achievement.target}</small>
                        </div>
                        <strong className="dashboard-achievement-badge">
                          <AchIcon size={16} strokeWidth={achieved ? 2.5 : 1.5} />
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
                    <article className="dashboard-region-card" key={region.name}>
                      <div>
                        <p className="section-kicker">{region.name}</p>
                        <h3>{region.completed} / {region.total}</h3>
                        <span>{region.planned} planned</span>
                      </div>
                      <strong>{region.percent}%</strong>
                      <div className="progress-track"><span style={{ width: `${region.percent}%` }} /></div>
                    </article>
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
                      <Link
                        to={`/collections/${collection.slug}`}
                        className="collection-progress-card collection-progress-card--premium"
                        key={collection.id}
                      >
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
                    <button onClick={() => handleExport("csv")} disabled={exporting === "csv"}>
                      {exporting === "csv" ? "Exporting..." : "Export CSV"}
                    </button>
                    <button onClick={() => handleExport("gpx")} disabled={exporting === "gpx"}>
                      {exporting === "gpx" ? "Exporting..." : "Export GPX"}
                    </button>
                  </div>
                )}
                </div>
                
                <div className="my-progress-list">
                  {stats.recentLogs.length === 0 && <p>No mountain logs yet.</p>}
                  {stats.recentLogs.slice(0, showAllProgress ? undefined : MAX_VISIBLE).map((log) => (
                    <div className="my-progress-card" key={log.id}>
                      <div>
                        <p className="my-progress-card__status">{log.status}</p>
                        <h3>{log.mountain_detail?.name}</h3>
                        <p>{log.mountain_detail?.region?.name}</p>
                      </div>
                      <div className="my-progress-card__meta">
                        <span>{log.completed_date || "No date"}</span>
                        <span>{log.hike_distance_km || "—"}km</span>
                      </div>
                    </div>
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

