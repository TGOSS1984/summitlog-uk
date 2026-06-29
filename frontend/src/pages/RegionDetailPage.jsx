import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMountains, getProgressLogs, getRegions } from "../lib/api";
import { TbCheck, TbFlag, TbMountain } from "react-icons/tb";
import {
  getMountainLogStatus,
  computeCompletionCountById,
  computeScopedStats,
} from "../components/mountains/mountainProgress";
import MountainProgressRow from "../components/mountains/MountainProgressRow";
import RowSkeleton from "../components/mountains/RowSkeleton";

function RegionDetailPage() {
  const { slug } = useParams();
  const [regions, setRegions] = useState([]);
  const [mountains, setMountains] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("height_desc");

  useEffect(() => {
    async function loadRegion() {
      try {
        const [regionData, mountainData] = await Promise.all([
          getRegions(),
          getMountains({ region__slug: slug }),
        ]);
        setRegions(Array.isArray(regionData) ? regionData : []);
        setMountains(Array.isArray(mountainData) ? mountainData : mountainData.results || []);
        try {
          const logData = await getProgressLogs();
          setLogs(Array.isArray(logData) ? logData : logData.results || []);
        } catch {
          // not logged in — show region without personal progress
        }
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    loadRegion();
  }, [slug]);

  const region = regions.find((item) => item.slug === slug);

  const completionCountById = useMemo(() => computeCompletionCountById(logs), [logs]);

  const stats = useMemo(() => {
    const { completed, planned, total, percent } = computeScopedStats({ mountains, logs });
    const highest = mountains.reduce((h, m) => Math.max(h, Number(m.height_m || 0)), 0);
    return { completed, planned, total, percent, highest };
  }, [logs, mountains]);

  const orderedMountains = useMemo(() => {
    const sorted = [...mountains];
    if (sortOrder === "most_completed") {
      return sorted.sort((a, b) => (completionCountById[b.id] || 0) - (completionCountById[a.id] || 0));
    }
    if (sortOrder === "height_asc") {
      return sorted.sort((a, b) => Number(a.height_m || 0) - Number(b.height_m || 0));
    }
    if (sortOrder === "name") {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    // default: height high → low
    return sorted.sort((a, b) => Number(b.height_m || 0) - Number(a.height_m || 0));
  }, [mountains, sortOrder, completionCountById]);

  const filteredMountains = useMemo(() => {
    if (statusFilter === "all") return orderedMountains;
    return orderedMountains.filter(
      (m) => getMountainLogStatus(m, logs) === statusFilter
    );
  }, [orderedMountains, logs, statusFilter]);

  if (status === "loading") {
    return (
      <main>
        <div className="skeleton-hero" />
        <section className="section section-light">
          <div className="container">
            <div className="collection-overview-grid">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton-card" style={{ height: 120 }} />)}
            </div>
            <div className="collection-mountain-list" style={{ marginTop: "2rem" }}>
              {Array.from({ length: 8 }).map((_, i) => <RowSkeleton key={i} />)}
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main>
        <section className="section section-dark">
          <div className="container">
            <p className="section-kicker">Error</p>
            <h1>Unable to load region</h1>
            <p>Check the server is running and try again.</p>
            <Link to="/mountains" className="button-primary" style={{ marginTop: "2rem", display: "inline-flex" }}>
              Browse mountains
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!region) {
    return (
      <main>
        <section className="section section-dark">
          <div className="container">
            <div className="page-empty" style={{ color: "var(--color-text-light)" }}>
              <TbMountain size={48} strokeWidth={1} />
              <h2 style={{ color: "var(--color-text-light)" }}>Region not found</h2>
              <p style={{ color: "rgba(248,250,252,0.7)" }}>This region doesn't exist or has been removed.</p>
              <Link to="/mountains" className="button-primary">Browse mountains</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section section-dark region-hero">
        <div className="container region-hero__grid">
          <div>
            <p className="section-kicker"><span className="kicker-line" />Mountain Region</p>
            <h1>{region.name}</h1>
            <p>{region.description}</p>
          </div>
          <aside className="glass-card region-hero__panel">
            <p>Region progress</p>
            <strong>{stats.percent}%</strong>
            <span>{stats.completed} / {stats.total} completed</span>
            <div className="progress-track">
              <span style={{ width: `${stats.percent}%` }} />
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">

          {/* Stat cards — aligned with collection detail */}
          <div className="collection-overview-grid">
            <article className="collection-mini-stat">
              <div className="collection-mini-stat__icon collection-mini-stat__icon--completed">
                <TbCheck size={18} strokeWidth={2.5} />
              </div>
              <p>Completed</p>
              <strong>{stats.completed}</strong>
            </article>
            <article className="collection-mini-stat">
              <div className="collection-mini-stat__icon collection-mini-stat__icon--planned">
                <TbFlag size={18} strokeWidth={1.8} />
              </div>
              <p>Planned</p>
              <strong>{stats.planned}</strong>
            </article>
            <article className="collection-mini-stat">
              <div className="collection-mini-stat__icon collection-mini-stat__icon--total">
                <TbMountain size={18} strokeWidth={1.5} />
              </div>
              <p>Total</p>
              <strong>{stats.total}</strong>
            </article>
          </div>

          {/* Toolbar — status filter + sort */}
          <div className="collection-list-toolbar">
            <p className="collection-list-count">
              {statusFilter === "all"
                ? `${orderedMountains.length} mountains`
                : `${filteredMountains.length} of ${orderedMountains.length} mountains`}
            </p>
            <div className="collection-status-filters">
              {["all", "completed", "planned", "not_started"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`collection-status-filter${statusFilter === s ? " collection-status-filter--active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "all" ? "All" : s === "not_started" ? "Not started" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="collection-sort">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="collection-sort__select"
                aria-label="Sort mountains by"
              >
                <option value="height_desc">Sort: Height (high → low)</option>
                <option value="height_asc">Sort: Height (low → high)</option>
                <option value="name">Sort: Name A–Z</option>
                <option value="most_completed">Sort: Most completed</option>
              </select>
            </div>
          </div>

          {filteredMountains.length === 0 ? (
            <div className="page-empty">
              <TbMountain size={48} strokeWidth={1} />
              <h2>No mountains match this filter</h2>
              <p>
                {statusFilter === "completed" && "You haven't completed any mountains in this region yet."}
                {statusFilter === "planned" && "You haven't planned any mountains in this region yet."}
                {statusFilter === "not_started" && "All mountains in this region have been logged."}
                {statusFilter === "all" && "No mountains found in this region."}
              </p>
              {statusFilter !== "all" && (
                <button className="button-secondary" onClick={() => setStatusFilter("all")}>
                  Show all mountains
                </button>
              )}
            </div>
          ) : (
            <div className="collection-mountain-list">
              {filteredMountains.map((mountain, index) => (
                <MountainProgressRow
                  key={mountain.id}
                  mountain={mountain}
                  logs={logs}
                  completionCountById={completionCountById}
                  getSubtitle={(m) =>
                    m.collection_memberships?.[0]?.collection?.name || m.collection?.name || null
                  }
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default RegionDetailPage;