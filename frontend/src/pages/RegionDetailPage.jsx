import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMountains, getProgressLogs, getRegions } from "../lib/api";

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
        setMountains(
          Array.isArray(mountainData) ? mountainData : mountainData.results || []
        );

        try {
          const logData = await getProgressLogs();
          setLogs(Array.isArray(logData) ? logData : logData.results || []);
        } catch (error) {
          console.warn("Progress logs unavailable:", error);
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
    const completedIds = new Set(
      logs.filter((log) => log.status === "completed").map((log) => log.mountain)
    );

    const plannedIds = new Set(
      logs.filter((log) => log.status === "planned").map((log) => log.mountain)
    );

    const completed = mountains.filter((mountain) =>
      completedIds.has(mountain.id)
    ).length;

    const planned = mountains.filter((mountain) =>
      plannedIds.has(mountain.id)
    ).length;

    const total = mountains.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    const highest = mountains.reduce((currentHighest, mountain) => {
      const height = Number(mountain.height_m || 0);
      return height > currentHighest ? height : currentHighest;
    }, 0);

    return {
      completed,
      planned,
      total,
      percent,
      highest,
    };
  }, [logs, mountains]);

  if (status === "loading") {
    return <p>Loading region...</p>;
  }

  if (status === "error" || !region) {
    return <p>Unable to load region.</p>;
  }

  return (
    <main>
      <section className="section section-dark region-hero">
        <div className="container region-hero__grid">
          <div>
            <p className="section-kicker">Region</p>
            <h1>{region.name}</h1>
            <p>{region.description}</p>
          </div>

          <aside className="glass-card region-hero__panel">
            <p>Region progress</p>
            <strong>{stats.percent}%</strong>
            <span>
              {stats.completed} / {stats.total} completed
            </span>

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
              <p>Completed</p>
              <strong>{stats.completed}</strong>
            </article>

            <article className="collection-mini-stat">
              <p>Planned</p>
              <strong>{stats.planned}</strong>
            </article>

            <article className="collection-mini-stat">
              <p>Highest visible</p>
              <strong>{stats.highest}m</strong>
            </article>
          </div>

          <div className="region-mountain-list">
            {mountains.map((mountain) => (
              <Link
                to={`/mountains/${mountain.slug}`}
                className="collection-mountain-row"
                key={mountain.id}
              >
                <span>{mountain.rank_in_collection || "—"}</span>
                <strong>{mountain.name}</strong>
                <small>
                  {mountain.collection?.name} / {mountain.height_m}m
                </small>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default RegionDetailPage;