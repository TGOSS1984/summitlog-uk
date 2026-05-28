import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMountains, getProgressLogs, getRegions } from "../lib/api";
import { TbCheck, TbFlag, TbMountain, TbRuler } from "react-icons/tb";

function RowSkeleton() {
  return (
    <div className="collection-mountain-row collection-row-skeleton">
      <div className="skeleton-pill" style={{ width: 42, height: 42, borderRadius: "50%" }} />
      <div style={{ flex: 1, display: "grid", gap: 6 }}>
        <div className="skeleton-line skeleton-line--title" style={{ width: "45%" }} />
        <div className="skeleton-line skeleton-line--short" style={{ width: "25%" }} />
      </div>
    </div>
  );
}

function RegionDetailPage() {
  const { slug } = useParams();
  const [regions, setRegions] = useState([]);
  const [mountains, setMountains] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");

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
          // not logged in
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

  const stats = useMemo(() => {
    const completedIds = new Set(logs.filter((l) => l.status === "completed").map((l) => l.mountain));
    const plannedIds = new Set(logs.filter((l) => l.status === "planned").map((l) => l.mountain));
    const completed = mountains.filter((m) => completedIds.has(m.id)).length;
    const planned = mountains.filter((m) => plannedIds.has(m.id)).length;
    const total = mountains.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    const highest = mountains.reduce((h, m) => Math.max(h, Number(m.height_m || 0)), 0);
    return { completed, planned, total, percent, highest };
  }, [logs, mountains]);

  if (status === "loading") {
    return (
      <main>
        <div className="skeleton-hero" />
        <section className="section section-light">
          <div className="container">
            <div className="region-overview-grid">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton-card" style={{ height: 120 }} />)}
            </div>
            <div className="region-mountain-list" style={{ marginTop: "2rem" }}>
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
            <p className="section-kicker"><span className="kicker-line" />Region</p>
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
          <div className="region-overview-grid">
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
                <TbRuler size={18} strokeWidth={1.5} />
              </div>
              <p>Highest</p>
              <strong>{stats.highest}m</strong>
            </article>
          </div>

          {mountains.length === 0 ? (
            <div className="page-empty">
              <TbMountain size={48} strokeWidth={1} />
              <h2>No mountains in this region</h2>
              <p>Mountains may not have been loaded yet.</p>
            </div>
          ) : (
            <div className="region-mountain-list">
              {mountains.map((mountain) => (
                <Link
                  to={`/mountains/${mountain.slug}`}
                  className="collection-mountain-row"
                  key={mountain.id}
                >
                  <span>{mountain.rank_in_collection || "—"}</span>
                  <strong>{mountain.name}</strong>
                  <small>{mountain.collection?.name} / {mountain.height_m}m</small>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default RegionDetailPage;
