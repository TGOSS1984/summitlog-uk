import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollections, getMountains, getProgressLogs } from "../lib/api";

function CollectionDetailPage() {
  const { slug } = useParams();

  const [collections, setCollections] = useState([]);
  const [mountains, setMountains] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadCollection() {
      try {
        const [collectionData, mountainData] = await Promise.all([
          getCollections(),
          getMountains({ collection__slug: slug }),
        ]);

        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setMountains(Array.isArray(mountainData) ? mountainData : mountainData.results || []);

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

    loadCollection();
  }, [slug]);

  const collection = collections.find((item) => item.slug === slug);

  const stats = useMemo(() => {
    const completedIds = new Set(
      logs.filter((log) => log.status === "completed").map((log) => log.mountain)
    );

    const plannedIds = new Set(
      logs.filter((log) => log.status === "planned").map((log) => log.mountain)
    );

    const completed = mountains.filter((mountain) => completedIds.has(mountain.id)).length;
    const planned = mountains.filter((mountain) => plannedIds.has(mountain.id)).length;
    const total = collection?.expected_total || mountains.length || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      planned,
      total,
      percent,
    };
  }, [collection, logs, mountains]);

  if (status === "loading") {
    return <p>Loading collection...</p>;
  }

  if (status === "error" || !collection) {
    return <p>Unable to load collection.</p>;
  }

  return (
    <main>
      <section className="section section-dark collection-hero">
        <div className="container collection-hero__grid">
          <div>
            <p className="section-kicker">Mountain collection</p>
            <h1>{collection.name}</h1>
            <p>{collection.description}</p>
          </div>

          <aside className="glass-card collection-hero__panel">
            <p>Progress</p>
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
          <div className="collection-overview-grid">
            <article className="collection-mini-stat">
              <p>Completed</p>
              <strong>{stats.completed}</strong>
            </article>

            <article className="collection-mini-stat">
              <p>Planned</p>
              <strong>{stats.planned}</strong>
            </article>

            <article className="collection-mini-stat">
              <p>Total</p>
              <strong>{stats.total}</strong>
            </article>
          </div>

          <div className="collection-mountain-list">
            {mountains.map((mountain) => (
              <Link
                to={`/mountains/${mountain.slug}`}
                className="collection-mountain-row"
                key={mountain.id}
              >
                <span>{mountain.rank_in_collection || "—"}</span>
                <strong>{mountain.name}</strong>
                <small>{mountain.height_m}m</small>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default CollectionDetailPage;