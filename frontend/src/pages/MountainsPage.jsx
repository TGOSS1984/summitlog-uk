import { useEffect, useMemo, useState } from "react";
import { getCollections, getMountains, getRegions } from "../lib/api";
import { Link } from "react-router-dom";

function MountainsPage() {
  const [mountains, setMountains] = useState([]);
  const [collections, setCollections] = useState([]);
  const [regions, setRegions] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    collection__slug: "",
    region__slug: "",
    ordering: "rank_in_collection",
  });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadFilters() {
      try {
        const [collectionData, regionData] = await Promise.all([
          getCollections(),
          getRegions(),
        ]);

        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setRegions(Array.isArray(regionData) ? regionData : []);
      } catch (error) {
        console.error(error);
      }
    }

    loadFilters();
  }, []);

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

    return {
      total,
      highest,
    };
  }, [mountains]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  return (
    <main className="page mountains-page">
      <section className="section section-dark mountains-hero">
        <div className="container mountains-hero__grid">
          <div>
            <p className="section-kicker">Explore the lists</p>
            <h1>Every summit, ordered and ready to track.</h1>
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
                name="collection__slug"
                value={filters.collection__slug}
                onChange={handleChange}
              >
                <option value="">All collections</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.slug}>
                    {collection.name}
                  </option>
                ))}
              </select>

              <select
                name="region__slug"
                value={filters.region__slug}
                onChange={handleChange}
              >
                <option value="">All regions</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.slug}>
                    {region.name}
                  </option>
                ))}
              </select>

              <select
                name="ordering"
                value={filters.ordering}
                onChange={handleChange}
              >
                <option value="rank_in_collection">Rank</option>
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
              {mountains.map((mountain) => (
                <Link
                    to={`/mountains/${mountain.slug}`}
                    className="mountain-card"
                    key={mountain.id}
                >
                    <div className="mountain-card__image">
                    <span>{mountain.rank_in_collection || "—"}</span>
                    </div>

                    <div className="mountain-card__body">
                    <div>
                        <p className="mountain-card__meta">
                        {mountain.collection?.name} / {mountain.region?.name}
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
                ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default MountainsPage;