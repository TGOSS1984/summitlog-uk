import { useEffect, useMemo, useState } from "react";
import { getMountains, getProgressLogs, getCollections, getRegions } from "../lib/api";
import { TbMountain, TbCheck, TbFlag } from "react-icons/tb";
import {
  getMountainLogStatus,
  computeCompletionCountById,
  computeScopedStats,
} from "../components/mountains/mountainProgress";
import MountainProgressRow from "../components/mountains/MountainProgressRow";
import RowSkeleton from "../components/mountains/RowSkeleton";

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
  return mountain.collection?.name || null;
}

function MountainsProgressPage() {
  const [mountains,   setMountains]   = useState([]);
  const [collections, setCollections] = useState([]);
  const [regions,     setRegions]     = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [status,      setStatus]      = useState("loading");

  // Scope filters — these change what's IN the list (and the KPI cards)
  const [collectionSlug, setCollectionSlug] = useState("");
  const [regionSlug,     setRegionSlug]     = useState("");
  const [search,         setSearch]         = useState("");

  // Display filters — these change how the (already scoped) list is shown
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder,    setSortOrder]    = useState("height_desc");

  useEffect(() => {
    async function load() {
      try {
        const [mountainData, collectionData, regionData] = await Promise.all([
          getMountains(), getCollections(), getRegions(),
        ]);
        setMountains(Array.isArray(mountainData) ? mountainData : mountainData.results || []);
        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setRegions(Array.isArray(regionData) ? regionData : []);
        try {
          const logData = await getProgressLogs();
          setLogs(Array.isArray(logData) ? logData : logData.results || []);
        } catch {
          // not logged in — show the list without personal progress
        }
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    load();
  }, []);

  const activeCollection = collections.find((c) => c.slug === collectionSlug);
  const activeRegion     = regions.find((r) => r.slug === regionSlug);

  // Mountains within the currently selected collection/region/search scope —
  // independent of the completed/planned/not-started toggle below, so the
  // hero % and KPI cards always reflect the scope, not the status filter.
  const scopedMountains = useMemo(() => {
    return mountains.filter((m) => {
      if (collectionSlug && !mountainBelongsToCollection(m, collectionSlug)) return false;
      if (regionSlug && m.region?.slug !== regionSlug) return false;
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [mountains, collectionSlug, regionSlug, search]);

  const completionCountById = useMemo(() => computeCompletionCountById(logs), [logs]);

  const stats = useMemo(
    () => computeScopedStats({
      mountains: scopedMountains,
      logs,
      // Only trust a collection's curated expected_total when it's the sole
      // scope active — combined with a region filter, the visible subset is
      // smaller than the whole collection, so fall back to the live count.
      expectedTotal: collectionSlug && !regionSlug ? activeCollection?.expected_total : undefined,
    }),
    [scopedMountains, logs, activeCollection, collectionSlug, regionSlug]
  );

  const orderedMountains = useMemo(() => {
    const sorted = [...scopedMountains];
    if (sortOrder === "most_completed") return sorted.sort((a, b) => (completionCountById[b.id] || 0) - (completionCountById[a.id] || 0));
    if (sortOrder === "height_asc")     return sorted.sort((a, b) => Number(a.height_m || 0) - Number(b.height_m || 0));
    if (sortOrder === "name")           return sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted.sort((a, b) => Number(b.height_m || 0) - Number(a.height_m || 0)); // height_desc default
  }, [scopedMountains, sortOrder, completionCountById]);

  const filteredMountains = useMemo(() => {
    if (statusFilter === "all") return orderedMountains;
    return orderedMountains.filter((m) => getMountainLogStatus(m, logs) === statusFilter);
  }, [orderedMountains, logs, statusFilter]);

  // Subtitle shows whichever axis ISN'T already the active scope — and
  // both, combined, when nothing's scoped at all.
  function getSubtitle(mountain) {
    if (collectionSlug) return mountain.region?.name || null;
    if (regionSlug)     return getMountainCollectionNames(mountain);
    return [getMountainCollectionNames(mountain), mountain.region?.name].filter(Boolean).join(" · ") || null;
  }

  const heroKicker = activeCollection ? "Mountain Collection" : activeRegion ? "Mountain Region" : "Explore the lists";
  const heroTitle  = activeCollection ? activeCollection.name : activeRegion ? activeRegion.name : "All mountains";
  const heroDesc   = activeCollection?.description
    || activeRegion?.description
    || "Browse every mountain in the database. Filter by collection or region, and track your completion across all of them at once.";

  const hasActiveFilters = Boolean(collectionSlug || regionSlug || search);

  function clearFilters() {
    setCollectionSlug(""); setRegionSlug(""); setSearch(""); setStatusFilter("all");
  }

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
            <h1>Unable to load mountains</h1>
            <p>Check the server is running and try again.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page mountains-page">
      <section className="section section-dark mountains-hero">
        <div className="container mountains-hero__grid">
          <div>
            <p className="section-kicker"><span className="kicker-line" />{heroKicker}</p>
            <h1>{heroTitle}</h1>
            <p>{heroDesc}</p>
          </div>
          <aside className="glass-card mountains-hero__panel">
            <p>Progress</p>
            <strong>{stats.percent}%</strong>
            <span>{stats.completed} / {stats.total} completed</span>
            <div className="progress-track">
              <span style={{ width: `${stats.percent}%` }} />
            </div>
          </aside>
        </div>
      </section>

      <section className="section section-light mountains-explorer">
        <div className="container">

          <div className="mountains-toolbar">
            <div>
              <p className="section-kicker">Mountain database</p>
              <h2>Filter by collection or region</h2>
            </div>
            <div className="mountains-filters">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search mountain"
              />
              <select value={collectionSlug} onChange={(e) => setCollectionSlug(e.target.value)} aria-label="Filter by collection">
                <option value="">All collections</option>
                {collections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
              <select value={regionSlug} onChange={(e) => setRegionSlug(e.target.value)} aria-label="Filter by region">
                <option value="">All regions</option>
                {regions.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
              </select>
            </div>
          </div>

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
                {statusFilter === "completed"   && "You haven't completed any mountains in this view yet."}
                {statusFilter === "planned"     && "You haven't planned any mountains in this view yet."}
                {statusFilter === "not_started" && "Everything in this view has already been logged."}
                {statusFilter === "all"         && "Try adjusting your filters."}
              </p>
              {(statusFilter !== "all" || hasActiveFilters) && (
                <button className="button-secondary" onClick={clearFilters}>
                  Clear filters
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
                  getSubtitle={getSubtitle}
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

export default MountainsProgressPage;