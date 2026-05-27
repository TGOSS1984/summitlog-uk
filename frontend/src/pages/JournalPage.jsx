import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  TbMountain, TbCalendar, TbRoute, TbWalk,
  TbStairs, TbFilter, TbBook,
} from "react-icons/tb";
import { getProgressLogs, getCollections } from "../lib/api";

function formatDate(d) {
  if (!d) return "No date recorded";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatMonth(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    month: "long", year: "numeric",
  });
}

const STATUS_LABELS = {
  completed: "Completed",
  planned: "Planned",
  not_started: "Not started",
};

const SEASON_LABELS = {
  summer: "☀️ Summer",
  winter: "❄️ Winter",
  spring: "🌸 Spring",
  autumn: "🍂 Autumn",
};

function JournalEntry({ log }) {
  const mountain = log.mountain_detail;

  return (
    <article className="journal-entry">
      <div className="journal-entry__header">
        <div className="journal-entry__title-row">
          <Link
            to={`/mountains/${mountain?.slug}`}
            className="journal-entry__name"
          >
            {mountain?.name || "Unknown mountain"}
          </Link>
          <span className={`journal-entry__status journal-entry__status--${log.status}`}>
            {STATUS_LABELS[log.status] || log.status}
          </span>
        </div>
        <div className="journal-entry__meta">
          {mountain?.region?.name && (
            <span className="journal-entry__region">{mountain.region.name}</span>
          )}
          {log.season && (
            <span className="journal-entry__season">{SEASON_LABELS[log.season] || log.season}</span>
          )}
          {mountain?.height_m && (
            <span className="journal-entry__height">{mountain.height_m}m</span>
          )}
        </div>
      </div>

      {(log.hike_distance_km || log.hike_duration_hours || log.steps || log.flights_climbed) && (
        <div className="journal-entry__stats">
          {log.hike_distance_km && (
            <span><TbRoute size={14} strokeWidth={1.8} />{Number(log.hike_distance_km).toFixed(1)}km</span>
          )}
          {log.hike_duration_hours && (
            <span><TbCalendar size={14} strokeWidth={1.8} />{Number(log.hike_duration_hours)}hrs</span>
          )}
          {log.steps && (
            <span><TbWalk size={14} strokeWidth={1.8} />{Number(log.steps).toLocaleString()} steps</span>
          )}
          {log.flights_climbed && (
            <span><TbStairs size={14} strokeWidth={1.8} />{log.flights_climbed} flights</span>
          )}
        </div>
      )}

      {log.route_taken && (
        <p className="journal-entry__route">
          <TbRoute size={13} strokeWidth={1.8} />
          {log.route_taken}
        </p>
      )}

      {log.notes && (
        <p className="journal-entry__notes">{log.notes}</p>
      )}

      {log.uploaded_image && (
        <img
          className="journal-entry__image"
          src={log.uploaded_image}
          alt={`${mountain?.name} summit photo`}
        />
      )}
    </article>
  );
}

function JournalPage() {
  const [logs, setLogs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [status, setStatus] = useState("loading");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterCollection, setFilterCollection] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [logData, colData] = await Promise.all([
          getProgressLogs(),
          getCollections(),
        ]);
        const allLogs = Array.isArray(logData) ? logData : logData.results || [];
        // Sort by completed_date desc, then updated_at
        allLogs.sort((a, b) => {
          const da = a.completed_date || a.updated_at || a.created_at;
          const db = b.completed_date || b.updated_at || b.created_at;
          return new Date(db) - new Date(da);
        });
        setLogs(allLogs);
        setCollections(Array.isArray(colData) ? colData : []);
        setStatus("success");
      } catch {
        setStatus("unauthenticated");
      }
    }
    load();
  }, []);

  const filtered = logs.filter((log) => {
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    if (filterSeason !== "all" && log.season !== filterSeason) return false;
    if (filterCollection !== "all") {
      const m = log.mountain_detail;
      const inCollection =
        m?.collection_memberships?.some(
          (mb) => String(mb.collection?.id) === filterCollection
        ) || String(m?.collection?.id) === filterCollection;
      if (!inCollection) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const name = log.mountain_detail?.name?.toLowerCase() || "";
      const notes = log.notes?.toLowerCase() || "";
      const route = log.route_taken?.toLowerCase() || "";
      if (!name.includes(q) && !notes.includes(q) && !route.includes(q)) return false;
    }
    return true;
  });

  // Group by month
  const grouped = filtered.reduce((acc, log) => {
    const month = formatMonth(log.completed_date || log.updated_at) || "Undated";
    if (!acc[month]) acc[month] = [];
    acc[month].push(log);
    return acc;
  }, {});

  const completedCount = logs.filter((l) => l.status === "completed").length;
  const plannedCount = logs.filter((l) => l.status === "planned").length;

  return (
    <main className="journal-page">
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
          {status === "loading" && <p>Loading your journal...</p>}

          {status === "unauthenticated" && (
            <div className="journal-empty">
              <TbBook size={48} strokeWidth={1} />
              <h2>Your journal awaits</h2>
              <p>Sign in to see your mountain diary.</p>
              <Link to="/account" className="button-primary">Sign in</Link>
            </div>
          )}

          {status === "success" && (
            <>
              {/* Stats strip */}
              <div className="journal-stats">
                <div className="journal-stat">
                  <strong>{logs.length}</strong>
                  <span>Total logs</span>
                </div>
                <div className="journal-stat">
                  <strong>{completedCount}</strong>
                  <span>Completed</span>
                </div>
                <div className="journal-stat">
                  <strong>{plannedCount}</strong>
                  <span>Planned</span>
                </div>
              </div>

              {/* Filters */}
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
                  {collections.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>

              {filtered.length === 0 && (
                <div className="journal-empty">
                  <TbMountain size={48} strokeWidth={1} />
                  <h2>No entries found</h2>
                  <p>Try adjusting your filters or log a mountain to get started.</p>
                  <Link to="/mountains" className="button-primary">Browse mountains</Link>
                </div>
              )}

              {/* Timeline grouped by month */}
              <div className="journal-timeline">
                {Object.entries(grouped).map(([month, monthLogs]) => (
                  <div className="journal-month" key={month}>
                    <div className="journal-month__header">
                      <span className="journal-month__label">{month}</span>
                      <span className="journal-month__count">
                        {monthLogs.length} {monthLogs.length === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <div className="journal-month__entries">
                      {monthLogs.map((log) => (
                        <JournalEntry key={log.id} log={log} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default JournalPage;
