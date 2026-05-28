import { useEffect, useMemo, useState } from "react";
import { getMountains } from "../lib/api";
import { Link } from "react-router-dom";
import { TbMountain } from "react-icons/tb";

const MAX_HEIGHT = 1345;

const COLLECTION_FILTERS = [
  { label: "All collections", value: "" },
  { label: "Wainwrights", value: "wainwrights" },
  { label: "Munros", value: "munros" },
  { label: "Nuttalls", value: "nuttalls" },
];

const REGION_FILTERS = [
  { label: "All regions", value: "" },
  { label: "Lake District", value: "lake-district" },
  { label: "Scotland", value: "scotland" },
  { label: "England", value: "england" },
  { label: "Wales", value: "wales" },
];

function getRegionClass(regionSlug) {
  if (!regionSlug) return "default";
  if (regionSlug.includes("scotland")) return "scotland";
  if (regionSlug.includes("wales")) return "wales";
  if (regionSlug.includes("lake-district")) return "lake-district";
  return "england";
}

function getCollectionNames(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships
      .map((membership) => membership.collection?.name)
      .filter(Boolean)
      .join(" / ");
  }
  return mountain.collection?.name || "Unlisted";
}

function getContourPath(id, tideY, width = 300, amplitude = 6) {
  const seed = (id || 1) * 9301 + 49297;
  const offsets = Array.from({ length: 8 }, (_, i) => {
    const r = ((seed * (i + 1) * 1013904223) % 2147483647) / 2147483647;
    return (r - 0.5) * amplitude * 2;
  });
  const step = width / (offsets.length - 1);
  const points = offsets.map((o, i) => `${i === 0 ? "M" : "L"}${Math.round(i * step)},${Math.round(tideY + o)}`);
  return points.join(" ");
}

function CardHeaderSVG({ mountain, index }) {
  const height = Number(mountain.height_m) || 0;
  const tidePercent = 0.2 + (height / MAX_HEIGHT) * 0.6;
  const cardH = 190;
  const tideY = Math.round(cardH * (1 - tidePercent));
  const w = 300;
  const id = mountain.id || index;
  const contour = getContourPath(id, tideY, w, 7);

  function getMountainPath(seed, w, h) {
    const r = (n) => ((seed * n * 1013904223 + 1664525) % 2147483647) / 2147483647;
    const peakX = Math.round(w * (0.38 + r(7) * 0.26));
    const peakY = Math.round(h * (0.08 + r(3) * 0.18));
    const shoulderSide = r(5) > 0.5 ? 1 : -1;
    const shoulderX = Math.round(peakX + shoulderSide * w * (0.18 + r(11) * 0.14));
    const shoulderY = Math.round(peakY + h * (0.12 + r(9) * 0.14));
    const leftFootY = Math.round(h * (0.55 + r(13) * 0.2));
    const rightFootY = Math.round(h * (0.55 + r(17) * 0.2));
    const lcp1x = Math.round(peakX * 0.25);
    const lcp1y = leftFootY;
    const lcp2x = Math.round(peakX * 0.65);
    const lcp2y = Math.round(peakY + h * 0.04);
    const rcp1x = Math.round(peakX + (w - peakX) * 0.35);
    const rcp1y = Math.round(peakY + h * 0.04);
    const rcp2x = Math.round(peakX + (w - peakX) * 0.78);
    const scp1x = Math.round((peakX + shoulderX) / 2);
    const scp1y = Math.round(Math.min(peakY, shoulderY) - h * 0.03);
    if (shoulderSide === -1) {
      return [`M0,${h}`, `L0,${leftFootY}`, `C${lcp1x},${leftFootY} ${shoulderX - 20},${shoulderY + 10} ${shoulderX},${shoulderY}`, `Q${scp1x},${scp1y} ${peakX},${peakY}`, `C${rcp1x},${rcp1y} ${rcp2x},${rightFootY} ${w},${rightFootY}`, `L${w},${h} Z`].join(" ");
    } else {
      return [`M0,${h}`, `L0,${leftFootY}`, `C${lcp1x},${lcp1y} ${lcp2x},${lcp2y} ${peakX},${peakY}`, `Q${scp1x},${scp1y} ${shoulderX},${shoulderY}`, `C${shoulderX + 20},${shoulderY + 5} ${rcp2x},${rightFootY} ${w},${rightFootY}`, `L${w},${h} Z`].join(" ");
    }
  }

  const silhouettePath = getMountainPath(id * 7 + 13, w, cardH);

  return (
    <svg viewBox={`0 0 ${w} ${cardH}`} preserveAspectRatio="none" className="mountain-card__header-svg" aria-hidden="true">
      <path d={silhouettePath} fill="rgba(127,181,179,0.14)" />
      <path d={`${contour} L${w},${cardH} L0,${cardH} Z`} fill="rgba(208,170,98,0.13)" />
      <path d={contour} fill="none" stroke="rgba(208,170,98,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="10" y={tideY - 6} fontFamily="DM Sans, sans-serif" fontSize="9" fontWeight="700" fill="rgba(208,170,98,0.85)" letterSpacing="0.08em">{height}m</text>
    </svg>
  );
}

function MountainCardSkeleton() {
  return (
    <div className="mountain-card skeleton-mountain-card">
      <div className="skeleton-card-image" />
      <div className="mountain-card__body">
        <div>
          <div className="skeleton-line skeleton-line--short" />
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
        <div className="mountain-card__stats">
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
        </div>
      </div>
    </div>
  );
}

function MountainsPage() {
  const [mountains, setMountains] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    collection_memberships__collection__slug: "",
    region__slug: "",
    ordering: "-height_m",
  });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMountains() {
      try {
        setStatus("loading");
        const activeFilters = Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== "")
        );
        const data = await getMountains(activeFilters);
        setMountains(Array.isArray(data) ? data : data.results || []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }
    loadMountains();
  }, [filters]);

  const summary = useMemo(() => {
    const total = mountains.length;
    const highest = mountains.reduce((h, m) => Math.max(h, Number(m.height_m || 0)), 0);
    return { total, highest };
  }, [mountains]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  const hasActiveFilters = filters.search || filters.collection_memberships__collection__slug || filters.region__slug;

  return (
    <main className="page mountains-page">
      <section className="section section-dark mountains-hero">
        <div className="container mountains-hero__grid">
          <div>
            <p className="section-kicker">Explore the lists</p>
            <h1 className="page-hero__h1">
              <span className="page-hero__h1-top">Every summit,</span>
              <span className="page-hero__h1-bottom">Ordered.</span>
            </h1>
            <p>Browse Wainwrights, Munros, Welsh Nuttalls and key UK summits. Filter by region or collection, then build your own completion record.</p>
          </div>
          <aside className="glass-card mountains-hero__panel">
            <p>Total visible mountains</p>
            <strong>{status === "loading" ? "—" : summary.total}</strong>
            <span>Highest visible: {status === "loading" ? "—" : `${summary.highest || 0}m`}</span>
          </aside>
        </div>
      </section>

      <section className="section section-light mountains-explorer">
        <div className="container">
          <div className="mountains-toolbar">
            <div>
              <p className="section-kicker">Mountain database</p>
              <h2>Explore mountains</h2>
            </div>
            <div className="mountains-filters">
              <input type="search" name="search" value={filters.search} onChange={handleChange} placeholder="Search mountain" />
              <select name="collection_memberships__collection__slug" value={filters.collection_memberships__collection__slug} onChange={handleChange}>
                {COLLECTION_FILTERS.map((c) => <option key={c.label} value={c.value}>{c.label}</option>)}
              </select>
              <select name="region__slug" value={filters.region__slug} onChange={handleChange}>
                {REGION_FILTERS.map((r) => <option key={r.label} value={r.value}>{r.label}</option>)}
              </select>
              <select name="ordering" value={filters.ordering} onChange={handleChange}>
                <option value="-height_m">Highest first</option>
                <option value="height_m">Lowest first</option>
                <option value="name">A-Z</option>
              </select>
            </div>
          </div>

          {status === "error" && (
            <div className="page-error">
              <TbMountain size={48} strokeWidth={1} />
              <h2>Could not load mountains</h2>
              <p>Check the Django server is running and try refreshing.</p>
            </div>
          )}

          {status === "loading" && (
            <div className="mountain-card-grid">
              {Array.from({ length: 9 }).map((_, i) => <MountainCardSkeleton key={i} />)}
            </div>
          )}

          {status === "success" && mountains.length === 0 && (
            <div className="page-empty">
              <TbMountain size={48} strokeWidth={1} />
              <h2>No mountains found</h2>
              <p>{hasActiveFilters ? "Try adjusting your filters." : "No mountains in the database yet."}</p>
              {hasActiveFilters && (
                <button className="button-secondary" onClick={() => setFilters({ search: "", collection_memberships__collection__slug: "", region__slug: "", ordering: "-height_m" })}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {status === "success" && mountains.length > 0 && (
            <div className="mountain-card-grid">
              {mountains.map((mountain, index) => {
                const regionClass = getRegionClass(mountain.region?.slug);
                return (
                  <Link to={`/mountains/${mountain.slug}`} className={`mountain-card mountain-card--${regionClass}`} key={mountain.id}>
                    <div className="mountain-card__image">
                      <CardHeaderSVG mountain={mountain} index={index} />
                      <span>{index + 1}</span>
                    </div>
                    <div className="mountain-card__body">
                      <div>
                        <p className="mountain-card__meta">{getCollectionNames(mountain)} / {mountain.region?.name}</p>
                        <h3>{mountain.name}</h3>
                        <p>{mountain.summary}</p>
                      </div>
                      <div className="mountain-card__stats">
                        <span>{mountain.height_m}m</span>
                        <span>{mountain.height_ft || "—"}ft</span>
                        <span>Prom. {mountain.prominence_m || "—"}m</span>
                      </div>
                    </div>
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

export default MountainsPage;
