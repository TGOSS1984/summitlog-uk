import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TbMountain } from "react-icons/tb";
import { getProgressLogs, getCollections } from "../lib/api";

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Distribute items into columns for masonry layout
function buildColumns(items, columnCount) {
  const columns = Array.from({ length: columnCount }, () => []);
  items.forEach((item, i) => {
    columns[i % columnCount].push(item);
  });
  return columns;
}

function GalleryItem({ log, index, onClick }) {
  // Alternate aspect ratios for visual variety — tall, square, wide
  const aspects = ["gallery-item--tall", "gallery-item--square", "gallery-item--square", "gallery-item--wide", "gallery-item--square"];
  const aspect = aspects[index % aspects.length];

  return (
    <button
      className={`gallery-item ${aspect}`}
      onClick={onClick}
      aria-label={`View photo of ${log.mountain_detail?.name}`}
    >
      <img src={log.uploaded_image} alt={log.mountain_detail?.name} loading="lazy" />
      <div className="gallery-item__overlay">
        <strong>{log.mountain_detail?.name}</strong>
        <div className="gallery-item__overlay-meta">
          {log.mountain_detail?.region?.name && (
            <span className="gallery-item__region">{log.mountain_detail.region.name}</span>
          )}
          {log.completed_date && (
            <span className="gallery-item__date">{formatDate(log.completed_date)}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function GalleryPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [status, setStatus] = useState("loading");
  const [filterCollection, setFilterCollection] = useState("all");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [columns, setColumns] = useState(3);

  // Responsive column count
  useEffect(() => {
    function updateColumns() {
      if (window.innerWidth < 640) setColumns(1);
      else if (window.innerWidth < 900) setColumns(2);
      else setColumns(3);
    }
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const [logData, colData] = await Promise.all([
          getProgressLogs(),
          getCollections(),
        ]);
        const allLogs = Array.isArray(logData) ? logData : logData.results || [];
        const withImages = allLogs
          .filter((l) => l.uploaded_image)
          .sort((a, b) => {
            const da = a.completed_date || a.updated_at || a.created_at;
            const db = b.completed_date || b.updated_at || b.created_at;
            return new Date(db) - new Date(da);
          });
        setLogs(withImages);
        setCollections(Array.isArray(colData) ? colData : []);
        setStatus("success");
      } catch {
        navigate("/account", { replace: true });
      }
    }
    load();
  }, [navigate]);

  const filtered = logs.filter((log) => {
    if (filterCollection !== "all") {
      const m = log.mountain_detail;
      const inCollection =
        m?.collection_memberships?.some((mb) => String(mb.collection?.id) === filterCollection) ||
        String(m?.collection?.id) === filterCollection;
      if (!inCollection) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!(log.mountain_detail?.name?.toLowerCase() || "").includes(q)) return false;
    }
    return true;
  });

  const masonryColumns = buildColumns(filtered, columns);

  // Keyboard navigation for lightbox
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" && lightbox !== null) setLightbox((i) => (i + 1) % filtered.length);
      if (e.key === "ArrowLeft" && lightbox !== null) setLightbox((i) => (i - 1 + filtered.length) % filtered.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, filtered.length]);

  return (
    <main className="gallery-page">
      <section className="section section-dark gallery-hero">
        <div className="container">
          <p className="section-kicker"><span className="kicker-line" />Gallery</p>
          <h1 className="page-hero__h1">
            <span className="page-hero__h1-top">Your summit</span>
            <span className="page-hero__h1-bottom">Photos.</span>
          </h1>
          <p>Every photo you've uploaded across your mountain logs, in one place.</p>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          {status === "loading" && (
            <div className="gallery-masonry">
              {Array.from({ length: columns }).map((_, ci) => (
                <div key={ci} className="gallery-column">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`gallery-item-skeleton ${i % 2 === 0 ? "gallery-item-skeleton--tall" : ""}`} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {status === "success" && (
            <>
              <div className="gallery-toolbar">
                <p className="gallery-count">
                  {filtered.length} {filtered.length === 1 ? "photo" : "photos"}
                </p>
                <div className="gallery-filters">
                  <input type="text" placeholder="Search mountains..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  <select value={filterCollection} onChange={(e) => setFilterCollection(e.target.value)}>
                    <option value="all">All collections</option>
                    {collections.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {filtered.length === 0 && (
                <div className="journal-empty">
                  <TbMountain size={48} strokeWidth={1} />
                  <h2>No photos yet</h2>
                  <p>{logs.length === 0 ? "Upload a photo when logging a mountain to see it here." : "No photos match your filters."}</p>
                  <Link to="/mountains" className="button-primary">Browse mountains</Link>
                </div>
              )}

              {filtered.length > 0 && (
                <div className="gallery-masonry">
                  {masonryColumns.map((col, ci) => (
                    <div key={ci} className="gallery-column">
                      {col.map((log, i) => {
                        const globalIndex = filtered.indexOf(log);
                        return (
                          <GalleryItem
                            key={log.id}
                            log={log}
                            index={ci * 10 + i}
                            onClick={() => setLightbox(globalIndex)}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div className="gallery-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="gallery-lightbox__close" onClick={() => setLightbox(null)} aria-label="Close">✕</button>
          {lightbox > 0 && (
            <button className="gallery-lightbox__prev" onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }} aria-label="Previous">‹</button>
          )}
          {lightbox < filtered.length - 1 && (
            <button className="gallery-lightbox__next" onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }} aria-label="Next">›</button>
          )}
          <div className="gallery-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <img src={filtered[lightbox].uploaded_image} alt={filtered[lightbox].mountain_detail?.name} />
            <div className="gallery-lightbox__caption">
              <Link to={`/mountains/${filtered[lightbox].mountain_detail?.slug}`} onClick={() => setLightbox(null)}>
                {filtered[lightbox].mountain_detail?.name}
              </Link>
              <span>{filtered[lightbox].mountain_detail?.region?.name}</span>
              {filtered[lightbox].completed_date && <span>{formatDate(filtered[lightbox].completed_date)}</span>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default GalleryPage;
