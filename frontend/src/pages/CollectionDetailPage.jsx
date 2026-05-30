import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollections, getMountains, getProgressLogs } from "../lib/api";
import { TbCheck, TbFlag, TbMountain, TbRepeat } from "react-icons/tb";

function getCollectionRank(mountain, collectionSlug) {
  const membership = mountain.collection_memberships?.find(
    (item) => item.collection?.slug === collectionSlug
  );
  return membership?.rank_in_collection || mountain.rank_in_collection || "—";
}

function getMountainLogStatus(mountain, logs) {
  const log = logs.find((item) => item.mountain === mountain.id);
  return log?.status || "not_started";
}

function getStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "planned") return "Planned";
  return "Not started";
}

function getRankStyle(rank) {
  const n = Number(rank);
  if (n >= 1 && n <= 3) return "collection-rank--gold";
  return "";
}

function RowSkeleton() {
  return (
    <div className="collection-mountain-row collection-row-skeleton">
      <div className="skeleton-pill" style={{ width: 42, height: 42, borderRadius: "50%" }} />
      <div style={{ flex: 1, display: "grid", gap: 6 }}>
        <div className="skeleton-line skeleton-line--title" style={{ width: "45%" }} />
        <div className="skeleton-line skeleton-line--short" style={{ width: "25%" }} />
      </div>
      <div className="skeleton-pill" style={{ width: 80 }} />
    </div>
  );
}

function CollectionDetailPage() {
  const { slug } = useParams();
  const [collections, setCollections] = useState([]);
  const [mountains, setMountains] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("rank");

  useEffect(() => {
    async function loadCollection() {
      try {
        const [collectionData, mountainData] = await Promise.all([
          getCollections(),
          getMountains({ collection_memberships__collection__slug: slug }),
        ]);
        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setMountains(Array.isArray(mountainData) ? mountainData : mountainData.results || []);
        try {
          const logData = await getProgressLogs();
          setLogs(Array.isArray(logData) ? logData : logData.results || []);
        } catch {
          // not logged in — show collection without personal progress
        }
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    loadCollection();
  }, [slug]);

  const collection = collections.find((item) => item.slug === slug);

  // Completion count per mountain id (completed logs only)
  const completionCountById = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (log.status === "completed") {
        acc[log.mountain] = (acc[log.mountain] || 0) + 1;
      }
      return acc;
    }, {});
  }, [logs]);

  const orderedMountains = useMemo(() => {
    const sorted = [...mountains];
    if (sortOrder === "most_completed") {
      return sorted.sort((a, b) => (completionCountById[b.id] || 0) - (completionCountById[a.id] || 0));
    }
    if (sortOrder === "height_desc") {
      return sorted.sort((a, b) => Number(b.height_m || 0) - Number(a.height_m || 0));
    }
    if (sortOrder === "height_asc") {
      return sorted.sort((a, b) => Number(a.height_m || 0) - Number(b.height_m || 0));
    }
    if (sortOrder === "name") {
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    // default: rank
    return sorted.sort((a, b) => {
      const rankA = Number(getCollectionRank(a, slug)) || 9999;
      const rankB = Number(getCollectionRank(b, slug)) || 9999;
      return rankA - rankB;
    });
  }, [mountains, slug, sortOrder, completionCountById]);

  const filteredMountains = useMemo(() => {
    if (statusFilter === "all") return orderedMountains;
    return orderedMountains.filter(
      (m) => getMountainLogStatus(m, logs) === statusFilter
    );
  }, [orderedMountains, logs, statusFilter]);

  const stats = useMemo(() => {
    const completedIds = new Set(logs.filter((l) => l.status === "completed").map((l) => l.mountain));
    const plannedIds = new Set(logs.filter((l) => l.status === "planned").map((l) => l.mountain));
    const completed = mountains.filter((m) => completedIds.has(m.id)).length;
    const planned = mountains.filter((m) => plannedIds.has(m.id)).length;
    const total = collection?.expected_total || mountains.length || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { completed, planned, total, percent };
  }, [collection, logs, mountains]);

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
            <h1>Unable to load collection</h1>
            <p>Check the server is running and try again.</p>
            <Link to="/mountains" className="button-primary" style={{ marginTop: "2rem", display: "inline-flex" }}>
              Browse mountains
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (!collection) {
    return (
      <main>
        <section className="section section-dark">
          <div className="container">
            <div className="page-empty" style={{ color: "var(--color-text-light)" }}>
              <TbMountain size={48} strokeWidth={1} />
              <h2 style={{ color: "var(--color-text-light)" }}>Collection not found</h2>
              <p style={{ color: "rgba(248,250,252,0.7)" }}>This collection doesn't exist or has been removed.</p>
              <Link to="/mountains" className="button-primary">Browse mountains</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section section-dark collection-hero">
        <div className="container collection-hero__grid">
          <div>
            <p className="section-kicker">
              <span className="kicker-line" />
              Mountain Collection
            </p>
            <h1>{collection.name}</h1>
            <p>{collection.description}</p>
          </div>
          <aside className="glass-card collection-hero__panel">
            <p>Progress</p>
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
                <option value="rank">Sort: Rank</option>
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
                {statusFilter === "completed" && "You haven't completed any mountains in this collection yet."}
                {statusFilter === "planned" && "You haven't planned any mountains in this collection yet."}
                {statusFilter === "not_started" && "All mountains in this collection have been logged."}
                {statusFilter === "all" && "No mountains found in this collection."}
              </p>
              {statusFilter !== "all" && (
                <button className="button-secondary" onClick={() => setStatusFilter("all")}>
                  Show all mountains
                </button>
              )}
            </div>
          ) : (
            <div className="collection-mountain-list">
              {filteredMountains.map((mountain) => {
                const mountainStatus = getMountainLogStatus(mountain, logs);
                const rank = getCollectionRank(mountain, slug);
                const completionCount = completionCountById[mountain.id] || 0;
                return (
                  <Link
                    to={`/mountains/${mountain.slug}`}
                    className={`collection-mountain-row collection-mountain-row--${mountainStatus}`}
                    key={mountain.id}
                  >
                    <span className={`collection-rank ${getRankStyle(rank)}`}>{rank}</span>
                    <strong>{mountain.name}</strong>
                    <small>{mountain.height_m}m</small>
                    {/* Completion count badge — only shown when summit has been completed */}
                    {completionCount > 0 && (
                      <span className="collection-completion-count" title={`Summited ${completionCount} ${completionCount === 1 ? "time" : "times"}`}>
                        <TbRepeat size={11} strokeWidth={2} />
                        ×{completionCount}
                      </span>
                    )}
                    <em className={`collection-status collection-status--${mountainStatus}`}>
                      {getStatusLabel(mountainStatus)}
                    </em>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default CollectionDetailPage;
