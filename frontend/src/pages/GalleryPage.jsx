import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TbPhoto, TbFilter, TbMountain } from "react-icons/tb";
import { getProgressLogs, getCollections } from "../lib/api";

function GalleryPage() {
  const [logs, setLogs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [status, setStatus] = useState("loading");
  const [filterCollection, setFilterCollection] = useState("all");
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState(null);

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
        setStatus("unauthenticated");
      }
    }
    load();
  }, []);

  const filtered = logs.filter((log) => {
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
      if (!name.includes(q)) return false;
    }
    return true;
  });

  function formatDate(d) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric", month: "short", year: "numeric",
    });
  }

  // Close lightbox on escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight" && lightbox !== null) {
        setLightbox((i) => (i + 1) % filtered.length);
      }
      if (e.key === "ArrowLeft" && lightbox !== null) {
        setLightbox((i) => (i - 1 + filtered.length) % filtered.length);
      }
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
          {status === "loading" && <p>Loading your gallery...</p>}

          {status === "unauthenticated" && (
            <div className="journal-empty">
              <TbPhoto size={48} strokeWidth={1} />
              <h2>Your gallery awaits</h2>
              <p>Sign in to see your summit photos.</p>
              <Link to="/account" className="button-primary">Sign in</Link>
            </div>
          )}

          {status === "success" && (
            <>
              <div className="gallery-toolbar">
                <p className="gallery-count">
                  {filtered.length} {filtered.length === 1 ? "photo" : "photos"}
                </p>
                <div className="gallery-filters">
                  <input
                    type="text"
                    placeholder="Search mountains..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <select
                    value={filterCollection}
                    onChange={(e) => setFilterCollection(e.target.value)}
                  >
                    <option value="all">All collections</option>
                    {collections.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {filtered.length === 0 && (
                <div className="journal-empty">
                  <TbMountain size={48} strokeWidth={1} />
                  <h2>No photos yet</h2>
                  <p>
                    {logs.length === 0
                      ? "Upload a photo when logging a mountain to see it here."
                      : "No photos match your filters."}
                  </p>
                  <Link to="/mountains" className="button-primary">Browse mountains</Link>
                </div>
              )}

              <div className="gallery-grid">
                {filtered.map((log, index) => (
                  <button
                    key={log.id}
                    className="gallery-item"
                    onClick={() => setLightbox(index)}
                    aria-label={`View photo of ${log.mountain_detail?.name}`}
                  >
                    <img
                      src={log.uploaded_image}
                      alt={log.mountain_detail?.name}
                      loading="lazy"
                    />
                    <div className="gallery-item__overlay">
                      <strong>{log.mountain_detail?.name}</strong>
                      {log.completed_date && (
                        <span>{formatDate(log.completed_date)}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div
          className="gallery-lightbox"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="gallery-lightbox__close"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            ✕
          </button>
          {lightbox > 0 && (
            <button
              className="gallery-lightbox__prev"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
              aria-label="Previous"
            >
              ‹
            </button>
          )}
          {lightbox < filtered.length - 1 && (
            <button
              className="gallery-lightbox__next"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
              aria-label="Next"
            >
              ›
            </button>
          )}
          <div
            className="gallery-lightbox__content"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={filtered[lightbox].uploaded_image}
              alt={filtered[lightbox].mountain_detail?.name}
            />
            <div className="gallery-lightbox__caption">
              <Link
                to={`/mountains/${filtered[lightbox].mountain_detail?.slug}`}
                onClick={() => setLightbox(null)}
              >
                {filtered[lightbox].mountain_detail?.name}
              </Link>
              <span>{filtered[lightbox].mountain_detail?.region?.name}</span>
              {filtered[lightbox].completed_date && (
                <span>{formatDate(filtered[lightbox].completed_date)}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default GalleryPage;
