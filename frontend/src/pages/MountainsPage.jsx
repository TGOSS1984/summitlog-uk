import { useEffect, useMemo, useState } from "react";
import { getMountains } from "../lib/api";
import { Link } from "react-router-dom";
import { TbMountain, TbRuler, TbMapPin, TbSearch, TbFilter } from "react-icons/tb";

const MAX_HEIGHT = 1345; // Ben Nevis — used to scale all tide lines

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

// Map region slug → CSS class suffix
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

// Generate a deterministic but unique-looking contour path per mountain
// Uses mountain id as a seed so the same mountain always gets the same shape
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

// Build the full SVG content for the card header
function CardHeaderSVG({ mountain, index }) {
  const height = Number(mountain.height_m) || 0;
  // tide level: percentage of card height (card is 190px tall)
  // higher mountain = line sits higher (lower y value)
  const tidePercent = 0.2 + (height / MAX_HEIGHT) * 0.6; // range 20%–80%
  const cardH = 190;
  const tideY = Math.round(cardH * (1 - tidePercent));
  const w = 300;
  const id = mountain.id || index;
  const contour = getContourPath(id, tideY, w, 7);

  return (
    <svg
      viewBox={`0 0 ${w} ${cardH}`}
      preserveAspectRatio="none"
      className="mountain-card__header-svg"
      aria-hidden="true"
    >
      {/* Faint background silhouette */}
      <path
        d={`M0,${cardH} L0,${Math.round(cardH * 0.6)} ${Array.from({ length: 12 }, (_, i) => {
          const x = Math.round((i / 11) * w);
          const seed2 = ((id * 31 + i * 17) % 100) / 100;
          const y = Math.round(cardH * (0.25 + seed2 * 0.35));
          return `L${x},${y}`;
        }).join(" ")} L${w},${Math.round(cardH * 0.5)} L${w},${cardH} Z`}
        fill="rgba(127,181,179,0.12)"
      />

      {/* Gold fill below the contour line */}
      <path
        d={`${contour} L${w},${cardH} L0,${cardH} Z`}
        fill="rgba(208,170,98,0.13)"
      />

      {/* The contour tide line itself */}
      <path
        d={contour}
        fill="none"
        stroke="rgba(208,170,98,0.7)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Elevation label */}
      <text
        x="10"
        y={tideY - 6}
        fontFamily="DM Sans, sans-serif"
        fontSize="9"
        fontWeight="700"
        fill="rgba(208,170,98,0.85)"
        letterSpacing="0.08em"
      >
        {height}m
      </text>
    </svg>
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
    const highest = mountains.reduce((currentHighest, mountain) => {
      const height = Number(mountain.height_m || 0);
      return height > currentHighest ? height : currentHighest;
    }, 0);
    return { total, highest };
  }, [mountains]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  }

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
            <p>
              Browse Wainwrights, Munros, Welsh Nuttalls and key UK summits.
              Filter by region or collection, then build your own completion
              record as the tracker develops.
            </p>
          </div>

          <aside className="glass-card mountains-hero__panel">
            <p>Total visible mountains</p>
            <strong>{summary.total}</strong>
            <span>Highest visible: {summary.highest || 0}m</span>
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
              <input
                type="search"
                name="search"
                value={filters.search}
                onChange={handleChange}
                placeholder="Search mountain"
              />
              <select
                name="collection_memberships__collection__slug"
                value={filters.collection_memberships__collection__slug}
                onChange={handleChange}
              >
                {COLLECTION_FILTERS.map((collection) => (
                  <option key={collection.label} value={collection.value}>
                    {collection.label}
                  </option>
                ))}
              </select>
              <select
                name="region__slug"
                value={filters.region__slug}
                onChange={handleChange}
              >
                {REGION_FILTERS.map((region) => (
                  <option key={region.label} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </select>
              <select
                name="ordering"
                value={filters.ordering}
                onChange={handleChange}
              >
                <option value="-height_m">Highest first</option>
                <option value="height_m">Lowest first</option>
                <option value="name">A-Z</option>
              </select>
            </div>
          </div>

          {status === "loading" && <p>Loading mountains...</p>}
          {status === "error" && (
            <p>Unable to load mountains. Check the Django server is running.</p>
          )}

          {status === "success" && (
            <div className="mountain-card-grid">
              {mountains.map((mountain, index) => {
                const regionClass = getRegionClass(mountain.region?.slug);
                return (
                  <Link
                    to={`/mountains/${mountain.slug}`}
                    className={`mountain-card mountain-card--${regionClass}`}
                    key={mountain.id}
                  >
                    <div className="mountain-card__image">
                      <CardHeaderSVG mountain={mountain} index={index} />
                      <span>{index + 1}</span>
                    </div>

                    <div className="mountain-card__body">
                      <div>
                        <p className="mountain-card__meta">
                          {getCollectionNames(mountain)} / {mountain.region?.name}
                        </p>
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
