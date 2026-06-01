import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TbMountain, TbCalendar, TbRoute, TbWalk,
  TbStairs, TbRepeat, TbEdit, TbTrash, TbX,
  TbFlag, TbChevronRight, TbCloud,
} from "react-icons/tb";
import { getProgressLogs, getCollections, getRouteLogs, deleteRouteLog, deleteProgressLog } from "../lib/api";
import { ConfirmModal } from "../components/ui/ConfirmModal";

function formatDate(d) {
  if (!d) return "No date recorded";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonth(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today  = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff   = Math.round((target - today) / 86400000);
  if (diff < 0)   return "Overdue";
  if (diff === 0) return "Today!";
  if (diff === 1) return "Tomorrow";
  if (diff < 7)   return `${diff} days`;
  if (diff < 14)  return "Next week";
  if (diff < 30)  return `${Math.round(diff / 7)} weeks`;
  return `${Math.round(diff / 30)} months`;
}

const STATUS_LABELS = { completed: "Completed", planned: "Planned", not_started: "Not started" };
const SEASON_LABELS = { summer: "☀️ Summer", winter: "❄️ Winter", spring: "🌸 Spring", autumn: "🍂 Autumn" };

// ── Historical weather chip ──────────────────────────────────────────────────
// Fetches Open-Meteo archive for the specific date of the ascent.
// Renders nothing if no coordinates or date, or if fetch fails.

function weatherEmojiFromCode(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

function HistoricalWeatherChip({ lat, lon, date }) {
  const [data,   setData]   = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!lat || !lon || !date) { setLoaded(true); return; }
    // Only fetch for dates in the past (archive API doesn't serve future dates)
    if (new Date(date) >= new Date()) { setLoaded(true); return; }

    fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
      `&start_date=${date}&end_date=${date}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FLondon`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.daily?.weathercode?.[0] != null) {
          setData({
            code:    json.daily.weathercode[0],
            maxTemp: Math.round(json.daily.temperature_2m_max[0]),
            minTemp: Math.round(json.daily.temperature_2m_min[0]),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [lat, lon, date]);

  if (!loaded || !data) return null;

  return (
    <span className="journal-weather-chip" title={`Weather on ${date}`}>
      {weatherEmojiFromCode(data.code)} {data.maxTemp}°/{data.minTemp}°
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function JournalEntrySkeleton() {
  return (
    <div className="journal-entry">
      <div className="skeleton-line skeleton-line--title" style={{ width: "50%" }} />
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line--short" style={{ width: "70%" }} />
    </div>
  );
}

// ── Individual mountain log entry ────────────────────────────────────────────

function JournalEntry({ log, completionCount, onDelete }) {
  const mountain = log.mountain_detail;
  const lat = mountain?.latitude;
  const lon = mountain?.longitude;

  return (
    <article className="journal-entry">
      <div className="journal-entry__header">
        <div className="journal-entry__title-row">
          <Link to={`/mountains/${mountain?.slug}`} className="journal-entry__name">
            {mountain?.name || "Unknown mountain"}
          </Link>
          <span className={`journal-entry__status journal-entry__status--${log.status}`}>
            {STATUS_LABELS[log.status] || log.status}
          </span>
          {completionCount > 1 && (
            <span className="journal-entry__repeat-badge" title={`Summited ${completionCount} times`}>
              <TbRepeat size={11} strokeWidth={2} />×{completionCount}
            </span>
          )}
        </div>
        <div className="journal-entry__meta">
          {mountain?.region?.name && <span className="journal-entry__region">{mountain.region.name}</span>}
          {log.season && <span className="journal-entry__season">{SEASON_LABELS[log.season] || log.season}</span>}
          {mountain?.height_m && <span className="journal-entry__height">{mountain.height_m}m</span>}
          {/* Historical weather chip — only for completed logs with a date */}
          {log.status === "completed" && log.completed_date && (
            <HistoricalWeatherChip lat={lat} lon={lon} date={log.completed_date} />
          )}
        </div>
      </div>

      {(log.hike_distance_km || log.hike_duration_hours || log.steps || log.flights_climbed) && (
        <div className="journal-entry__stats">
          {log.hike_distance_km && <span><TbRoute size={14} strokeWidth={1.8} />{Number(log.hike_distance_km).toFixed(1)}km</span>}
          {log.hike_duration_hours && <span><TbCalendar size={14} strokeWidth={1.8} />{Number(log.hike_duration_hours)}hrs</span>}
          {log.steps && <span><TbWalk size={14} strokeWidth={1.8} />{Number(log.steps).toLocaleString()} steps</span>}
          {log.flights_climbed && <span><TbStairs size={14} strokeWidth={1.8} />{log.flights_climbed} flights</span>}
        </div>
      )}
      {log.route_taken && <p className="journal-entry__route"><TbRoute size={13} strokeWidth={1.8} />{log.route_taken}</p>}
      {log.notes && <p className="journal-entry__notes">{log.notes}</p>}
      {log.uploaded_image && <img className="journal-entry__image" src={log.uploaded_image} alt={`${mountain?.name} summit photo`} />}

      <div className="journal-entry__actions">
        <Link
          to={`/mountains/${mountain?.slug}`}
          className="journal-entry__action-btn journal-entry__action-btn--edit"
        >
          <TbEdit size={13} strokeWidth={2} />Edit
        </Link>
        <button
          type="button"
          className="journal-entry__action-btn journal-entry__action-btn--delete"
          onClick={() => onDelete(log)}
        >
          <TbTrash size={13} strokeWidth={2} />Delete
        </button>
      </div>
    </article>
  );
}

// ── Route group entry ────────────────────────────────────────────────────────

function RouteEntry({ routeId, routeName, routeDate, routeStatus, logs, completionCountById, onDeleteRoute }) {
  const [expanded, setExpanded] = useState(true);
  const primaryLog = logs.find((l) => l.is_route_primary) || logs[0];
  const isPlanned  = routeStatus === "planned";

  return (
    <article className={`journal-route-entry${isPlanned ? " journal-route-entry--planned" : ""}`}>
      <div className="journal-route-entry__header">
        <div className="journal-route-entry__title-row">
          <div className={`journal-route-entry__badge${isPlanned ? " journal-route-entry__badge--planned" : ""}`}>
            {isPlanned ? <TbFlag size={13} strokeWidth={2} /> : <TbRoute size={13} strokeWidth={2} />}
            {isPlanned ? "Planned route" : "Route"}
          </div>
          <strong className="journal-route-entry__name">{routeName}</strong>
          {routeDate && (
            <span className="journal-route-entry__date">
              {isPlanned ? daysUntil(routeDate) : formatDate(routeDate)}
            </span>
          )}
          <span className="journal-route-entry__count">{logs.length} summits</span>
        </div>

        {(primaryLog?.hike_distance_km || primaryLog?.hike_duration_hours || primaryLog?.steps) && (
          <div className="journal-entry__stats" style={{ marginTop: "0.5rem" }}>
            {primaryLog.hike_distance_km && <span><TbRoute size={14} strokeWidth={1.8} />{Number(primaryLog.hike_distance_km).toFixed(1)}km{isPlanned ? " est." : " total"}</span>}
            {primaryLog.hike_duration_hours && <span><TbCalendar size={14} strokeWidth={1.8} />{Number(primaryLog.hike_duration_hours)}hrs{isPlanned ? " est." : " total"}</span>}
            {primaryLog.steps && <span><TbWalk size={14} strokeWidth={1.8} />{Number(primaryLog.steps).toLocaleString()} steps</span>}
            {primaryLog.flights_climbed && <span><TbStairs size={14} strokeWidth={1.8} />{primaryLog.flights_climbed} flights</span>}
          </div>
        )}
        {primaryLog?.route_taken && (
          <p className="journal-entry__route"><TbRoute size={13} strokeWidth={1.8} />{primaryLog.route_taken}</p>
        )}
        {primaryLog?.notes && <p className="journal-entry__notes">{primaryLog.notes}</p>}

        <div className="journal-route-entry__actions">
          <button type="button" className="journal-route-entry__toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Hide summits" : `Show ${logs.length} summits`}
          </button>
          <Link to={`/log-route/${routeId}/edit`} className="journal-route-entry__action-btn journal-route-entry__action-btn--edit">
            <TbEdit size={14} strokeWidth={2} />Edit
          </Link>
          <button type="button" className="journal-route-entry__action-btn journal-route-entry__action-btn--delete" onClick={() => onDeleteRoute(routeId, routeName, logs.length)}>
            <TbTrash size={14} strokeWidth={2} />Delete
          </button>
        </div>
      </div>

      {expanded && (
        <div className="journal-route-entry__summits">
          {logs.sort((a, b) => (b.is_route_primary ? 1 : 0) - (a.is_route_primary ? 1 : 0)).map((log) => (
            <div key={log.id} className="journal-route-entry__summit">
              <span className={`journal-route-entry__summit-dot${log.is_route_primary ? " journal-route-entry__summit-dot--primary" : ""}`} />
              <Link to={`/mountains/${log.mountain_detail?.slug}`} className="journal-route-entry__summit-name">
                {log.mountain_detail?.name}
              </Link>
              <span className="journal-route-entry__summit-meta">
                {log.mountain_detail?.height_m}m
                {log.is_route_primary && <span className="journal-route-entry__primary-tag">Primary</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

// ── Upcoming planned routes strip ────────────────────────────────────────────

function UpcomingRoutesStrip({ routes }) {
  if (!routes || routes.length === 0) return null;

  return (
    <div className="journal-upcoming-routes">
      <div className="journal-upcoming-routes__header">
        <p className="section-kicker"><span className="kicker-line" />Coming up</p>
        <h2>Planned routes</h2>
        <p>Multi-mountain routes you've saved as planned, sorted by target date.</p>
      </div>
      <div className="journal-upcoming-routes__list">
        {routes.map((route) => {
          const until     = daysUntil(route.completed_date);
          const daysLeft  = route.completed_date
            ? Math.round((new Date(route.completed_date) - new Date()) / 86400000)
            : null;
          const isImminent = daysLeft !== null && daysLeft <= 7;
          return (
            <Link
              to={`/log-route/${route.id}/edit`}
              className={`journal-upcoming-route-item${isImminent ? " journal-upcoming-route-item--imminent" : ""}`}
              key={route.id}
            >
              <div className="journal-upcoming-route-item__left">
                <span className="journal-upcoming-route-item__countdown">{until || "No date"}</span>
                {route.completed_date && (
                  <span className="journal-upcoming-route-item__date">{formatDateShort(route.completed_date)}</span>
                )}
              </div>
              <div className="journal-upcoming-route-item__main">
                <strong>{route.name}</strong>
                <span>{route.mountains_count} summit{route.mountains_count !== 1 ? "s" : ""}</span>
              </div>
              <TbChevronRight size={15} strokeWidth={2} className="journal-upcoming-route-item__arrow" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

function JournalPage() {
  const navigate = useNavigate();
  const [logs,            setLogs]            = useState([]);
  const [collections,     setCollections]     = useState([]);
  const [plannedRoutes,   setPlannedRoutes]   = useState([]);
  const [status,          setStatus]          = useState("loading");
  const [filterStatus,    setFilterStatus]    = useState("all");
  const [filterSeason,    setFilterSeason]    = useState("all");
  const [filterCollection, setFilterCollection] = useState("all");
  const [filterDateFrom,  setFilterDateFrom]  = useState("");
  const [filterDateTo,    setFilterDateTo]    = useState("");
  const [search,          setSearch]          = useState("");
  const [deleteRouteTarget, setDeleteRouteTarget] = useState(null);
  const [deleteLogTarget,   setDeleteLogTarget]   = useState(null);

  const hasDateFilter = filterDateFrom || filterDateTo;
  function clearDateFilter() { setFilterDateFrom(""); setFilterDateTo(""); }

  useEffect(() => {
    async function load() {
      try {
        const [logData, colData] = await Promise.all([getProgressLogs(), getCollections()]);
        const allLogs = Array.isArray(logData) ? logData : logData.results || [];
        allLogs.sort((a, b) => {
          const da = a.completed_date || a.updated_at || a.created_at;
          const db = b.completed_date || b.updated_at || b.created_at;
          return new Date(db) - new Date(da);
        });
        setLogs(allLogs);
        setCollections(Array.isArray(colData) ? colData : []);
        setStatus("success");
      } catch {
        navigate("/account", { replace: true });
      }
    }
    load();

    // Planned routes — non-blocking, fail silently
    async function loadPlannedRoutes() {
      try {
        const data = await getRouteLogs("planned");
        const list = Array.isArray(data) ? data : [];
        // Sort soonest first, no-date routes last
        list.sort((a, b) => {
          if (!a.completed_date && !b.completed_date) return 0;
          if (!a.completed_date) return 1;
          if (!b.completed_date) return -1;
          return new Date(a.completed_date) - new Date(b.completed_date);
        });
        setPlannedRoutes(list);
      } catch { /* not a fatal error */ }
    }
    loadPlannedRoutes();
  }, [navigate]);

  function handleDeleteRoute(routeId, routeName, count) {
    setDeleteRouteTarget({ id: routeId, name: routeName, count });
  }

  async function handleDeleteRouteConfirmed() {
    if (!deleteRouteTarget) return;
    try {
      await deleteRouteLog(deleteRouteTarget.id);
      setLogs((prev) => prev.filter((l) => l.route_group !== deleteRouteTarget.id));
      setPlannedRoutes((prev) => prev.filter((r) => r.id !== deleteRouteTarget.id));
      setDeleteRouteTarget(null);
    } catch (err) {
      alert(err.message || "Unable to delete route.");
      setDeleteRouteTarget(null);
    }
  }

  function handleDeleteLog(log) { setDeleteLogTarget(log); }

  async function handleDeleteLogConfirmed() {
    if (!deleteLogTarget) return;
    try {
      await deleteProgressLog(deleteLogTarget.id);
      setLogs((prev) => prev.filter((l) => l.id !== deleteLogTarget.id));
      setDeleteLogTarget(null);
    } catch (err) {
      alert(err.message || "Unable to delete log.");
      setDeleteLogTarget(null);
    }
  }

  const completionCountById = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (log.status === "completed") {
        acc[log.mountain] = (acc[log.mountain] || 0) + 1;
      }
      return acc;
    }, {});
  }, [logs]);

  const filtered = logs.filter((log) => {
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    if (filterSeason !== "all" && log.season !== filterSeason) return false;
    if (filterCollection !== "all") {
      const m = log.mountain_detail;
      const inCollection =
        m?.collection_memberships?.some((mb) => String(mb.collection?.id) === filterCollection) ||
        String(m?.collection?.id) === filterCollection;
      if (!inCollection) return false;
    }
    if (filterDateFrom || filterDateTo) {
      const logDate = log.completed_date || log.updated_at?.slice(0, 10) || null;
      if (!logDate) return false;
      if (filterDateFrom && logDate < filterDateFrom) return false;
      if (filterDateTo   && logDate > filterDateTo)   return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const name      = log.mountain_detail?.name?.toLowerCase() || "";
      const notes     = log.notes?.toLowerCase() || "";
      const route     = log.route_taken?.toLowerCase() || "";
      const routeName = log.route_name?.toLowerCase() || "";
      if (!name.includes(q) && !notes.includes(q) && !route.includes(q) && !routeName.includes(q)) return false;
    }
    return true;
  });

  const grouped = filtered.reduce((acc, log) => {
    const month = formatMonth(log.completed_date || log.updated_at) || "Undated";
    if (!acc[month]) acc[month] = [];
    acc[month].push(log);
    return acc;
  }, {});

  function groupMonthLogs(monthLogs) {
    const routeGroups = {};
    const individualLogs = [];
    for (const log of monthLogs) {
      if (log.route_group) {
        if (!routeGroups[log.route_group]) {
          routeGroups[log.route_group] = {
            routeId:     log.route_group,
            routeName:   log.route_name || "Unnamed route",
            routeDate:   log.completed_date,
            routeStatus: "completed", // logs in the timeline are completed
            logs:        [],
          };
        }
        routeGroups[log.route_group].logs.push(log);
      } else {
        individualLogs.push(log);
      }
    }
    const routeEntries     = Object.values(routeGroups).map((g) => ({ type: "route",      date: g.routeDate,                              data: g }));
    const individualEntries = individualLogs.map((l)             => ({ type: "individual", date: l.completed_date || l.updated_at || l.created_at, data: l }));
    return [...routeEntries, ...individualEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  const completedCount    = logs.filter((l) => l.status === "completed").length;
  const plannedCount      = logs.filter((l) => l.status === "planned").length;
  const repeatSummitCount = Object.values(completionCountById).filter((c) => c > 1).length;
  const routeCount        = new Set(logs.filter((l) => l.route_group).map((l) => l.route_group)).size;
  const deleteLogMountainName = deleteLogTarget?.mountain_detail?.name || "this log";

  return (
    <main className="journal-page">

      {deleteRouteTarget && (
        <ConfirmModal
          title="Delete route"
          message={`Delete "${deleteRouteTarget.name}" and all ${deleteRouteTarget.count} linked summit logs? This cannot be undone.`}
          confirmLabel="Delete route"
          cancelLabel="Keep it"
          danger
          onConfirm={handleDeleteRouteConfirmed}
          onCancel={() => setDeleteRouteTarget(null)}
        />
      )}

      {deleteLogTarget && (
        <ConfirmModal
          title="Delete ascent log"
          message={`Delete your log for ${deleteLogMountainName}? This cannot be undone.`}
          confirmLabel="Delete log"
          cancelLabel="Keep it"
          danger
          onConfirm={handleDeleteLogConfirmed}
          onCancel={() => setDeleteLogTarget(null)}
        />
      )}

      <section className="section section-dark journal-hero">
        <div className="container">
          <p className="section-kicker"><span className="kicker-line" />Journal</p>
          <h1 className="page-hero__h1">
            <span className="page-hero__h1-top">Your mountain</span>
            <span className="page-hero__h1-bottom">Diary.</span>
          </h1>
          <p>A chronological record of every summit attempted, planned and completed.</p>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          {status === "loading" && (
            <>
              <div className="journal-stats">
                {[1,2,3].map((i) => (
                  <div key={i} className="journal-stat">
                    <div className="skeleton-line skeleton-line--title" />
                    <div className="skeleton-line skeleton-line--short" />
                  </div>
                ))}
              </div>
              <div className="journal-timeline">
                <div className="journal-month">
                  <div className="skeleton-line skeleton-line--title" style={{ width: "180px", marginBottom: "1rem" }} />
                  <div className="journal-month__entries">
                    {[1,2,3].map((i) => <JournalEntrySkeleton key={i} />)}
                  </div>
                </div>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="journal-stats">
                <div className="journal-stat"><strong>{logs.length}</strong><span>Total logs</span></div>
                <div className="journal-stat"><strong>{completedCount}</strong><span>Completed</span></div>
                <div className="journal-stat"><strong>{plannedCount}</strong><span>Planned</span></div>
                {routeCount > 0 && (
                  <div className="journal-stat journal-stat--route">
                    <strong>{routeCount}</strong>
                    <span>Route{routeCount !== 1 ? "s" : ""} logged</span>
                  </div>
                )}
                {repeatSummitCount > 0 && (
                  <div className="journal-stat journal-stat--repeat">
                    <strong>{repeatSummitCount}</strong>
                    <span>Repeat summits</span>
                  </div>
                )}
              </div>

              {/* Upcoming planned routes */}
              <UpcomingRoutesStrip routes={plannedRoutes} />

              <div className="journal-filters">
                <input
                  type="text"
                  placeholder="Search mountains, notes, routes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="journal-search"
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="planned">Planned</option>
                  <option value="not_started">Not started</option>
                </select>
                <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
                  <option value="all">All seasons</option>
                  <option value="summer">Summer</option>
                  <option value="winter">Winter</option>
                  <option value="spring">Spring</option>
                  <option value="autumn">Autumn</option>
                </select>
                <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)}>
                  <option value="all">All collections</option>
                  {collections.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
                <div className="journal-date-range">
                  <label className="journal-date-range__label">
                    <span>From</span>
                    <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} max={filterDateTo || undefined} className="journal-date-input" />
                  </label>
                  <span className="journal-date-range__sep">—</span>
                  <label className="journal-date-range__label">
                    <span>To</span>
                    <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} min={filterDateFrom || undefined} className="journal-date-input" />
                  </label>
                  {hasDateFilter && (
                    <button type="button" className="journal-date-range__clear" onClick={clearDateFilter}>
                      <TbX size={13} strokeWidth={2.5} />Clear dates
                    </button>
                  )}
                </div>
              </div>

              {hasDateFilter && (
                <div className="journal-date-active">
                  <TbCalendar size={13} strokeWidth={2} />
                  <span>
                    {filterDateFrom && filterDateTo
                      ? `${new Date(filterDateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(filterDateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : filterDateFrom
                      ? `From ${new Date(filterDateFrom).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : `Up to ${new Date(filterDateTo).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                  </span>
                  <span className="journal-date-active__count">
                    {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                  </span>
                </div>
              )}

              {filtered.length === 0 && (
                <div className="journal-empty">
                  <TbMountain size={48} strokeWidth={1} />
                  <h2>No entries found</h2>
                  <p>{logs.length === 0 ? "Log a mountain to start your diary." : "Try adjusting your filters."}</p>
                  {hasDateFilter && (
                    <button className="button-secondary" onClick={clearDateFilter} style={{ marginBottom: "0.75rem" }}>
                      Clear date filter
                    </button>
                  )}
                  <Link to="/mountains" className="button-primary">Browse mountains</Link>
                </div>
              )}

              <div className="journal-timeline">
                {Object.entries(grouped).map(([month, monthLogs]) => {
                  const entries = groupMonthLogs(monthLogs);
                  return (
                    <div className="journal-month" key={month}>
                      <div className="journal-month__header">
                        <span className="journal-month__label">{month}</span>
                        <span className="journal-month__count">
                          {monthLogs.length} {monthLogs.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                      <div className="journal-month__entries">
                        {entries.map((entry) =>
                          entry.type === "route" ? (
                            <RouteEntry
                              key={`route-${entry.data.routeId}`}
                              routeId={entry.data.routeId}
                              routeName={entry.data.routeName}
                              routeDate={entry.data.routeDate}
                              routeStatus={entry.data.routeStatus}
                              logs={entry.data.logs}
                              completionCountById={completionCountById}
                              onDeleteRoute={handleDeleteRoute}
                            />
                          ) : (
                            <JournalEntry
                              key={entry.data.id}
                              log={entry.data}
                              completionCount={completionCountById[entry.data.mountain] || 0}
                              onDelete={handleDeleteLog}
                            />
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default JournalPage;
