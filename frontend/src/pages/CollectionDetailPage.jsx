import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCollections, getMountains, getProgressLogs } from "../lib/api";
import { TbCheck, TbFlag, TbMountain } from "react-icons/tb";

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

// Top 3 ranks get gold, rest get teal
function getRankStyle(rank) {
  const n = Number(rank);
  if (n >= 1 && n <= 3) return "collection-rank--gold";
  return "";
}

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
          getMountains({ collection_memberships__collection__slug: slug }),
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

  const orderedMountains = useMemo(() => {
    return [...mountains].sort((a, b) => {
      const rankA = Number(getCollectionRank(a, slug)) || 9999;
      const rankB = Number(getCollectionRank(b, slug)) || 9999;
      return rankA - rankB;
    });
  }, [mountains, slug]);

  const stats = useMemo(() => {
    const completedIds = new Set(logs.filter((l) => l.status === "completed").map((l) => l.mountain));
    const plannedIds = new Set(logs.filter((l) => l.status === "planned").map((l) => l.mountain));
    const completed = mountains.filter((m) => completedIds.has(m.id)).length;
    const planned = mountains.filter((m) => plannedIds.has(m.id)).length;
    const total = collection?.expected_total || mountains.length || 0;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { completed, planned, total, percent };
  }, [collection, logs, mountains]);

  if (status === "loading") return <p>Loading collection...</p>;
  if (status === "error" || !collection) return <p>Unable to load collection.</p>;

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

          {/* ── Stat cards with icons + gradient border ── */}
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

          {/* ── Mountain list ── */}
          <div className="collection-mountain-list">
            {orderedMountains.map((mountain) => {
              const mountainStatus = getMountainLogStatus(mountain, logs);
              const rank = getCollectionRank(mountain, slug);

              return (
                <Link
                  to={`/mountains/${mountain.slug}`}
                  className={`collection-mountain-row collection-mountain-row--${mountainStatus}`}
                  key={mountain.id}
                >
                  <span className={`collection-rank ${getRankStyle(rank)}`}>
                    {rank}
                  </span>
                  <strong>{mountain.name}</strong>
                  <small>{mountain.height_m}m</small>
                  <em className={`collection-status collection-status--${mountainStatus}`}>
                    {getStatusLabel(mountainStatus)}
                  </em>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default CollectionDetailPage;
