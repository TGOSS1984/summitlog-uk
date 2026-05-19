import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { getMountains, getProgressLogs } from "../lib/api";

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

function createMarkerIcon(status) {
  return L.divIcon({
    className: `summit-marker summit-marker--${status}`,
    html: "<span></span>",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
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

function getCollectionRank(mountain, collectionSlug) {
  if (collectionSlug) {
    const selectedMembership = mountain.collection_memberships?.find(
      (membership) => membership.collection?.slug === collectionSlug
    );

    if (selectedMembership?.rank_in_collection) {
      return selectedMembership.rank_in_collection;
    }
  }

  const firstRank = mountain.collection_memberships
    ?.map((membership) => membership.rank_in_collection)
    .find((rank) => rank !== null && rank !== undefined);

  return firstRank || mountain.rank_in_collection || "—";
}

function getStatusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "planned") return "Planned";
  return "Not started";
}

function MapBounds({ mountains }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = mountains
      .filter((mountain) => mountain.latitude && mountain.longitude)
      .map((mountain) => [
        Number(mountain.latitude),
        Number(mountain.longitude),
      ]);

    if (coordinates.length === 0) return;

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 10);
      return;
    }

    map.fitBounds(coordinates, {
      padding: [44, 44],
      maxZoom: 10,
    });
  }, [map, mountains]);

  return null;
}

function MapPage() {
  const [mountains, setMountains] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    collection_memberships__collection__slug: "",
    region__slug: "",
  });
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMapData() {
      try {
        setStatus("loading");

        const activeFilters = Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== "")
        );

        const mountainData = await getMountains(activeFilters);

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
        console.error("MAP ERROR:", error);
        setStatus("error");
      }
    }

    loadMapData();
  }, [filters]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  const logStatusByMountainId = useMemo(() => {
    return logs.reduce((lookup, log) => {
      lookup[log.mountain] = log.status;
      return lookup;
    }, {});
  }, [logs]);

  const mappableMountains = useMemo(() => {
    return mountains.filter(
      (mountain) => mountain.latitude && mountain.longitude
    );
  }, [mountains]);

  const mapStats = useMemo(() => {
    return mappableMountains.reduce(
      (totals, mountain) => {
        const mountainStatus =
          logStatusByMountainId[mountain.id] || "not_started";

        totals[mountainStatus] += 1;

        return totals;
      },
      {
        completed: 0,
        planned: 0,
        not_started: 0,
      }
    );
  }, [logStatusByMountainId, mappableMountains]);

  return (
    <main>
      <section className="section section-dark map-hero">
        <div className="container">
          <p className="section-kicker">Map</p>
          <h1>Explore the mountains by location.</h1>
          <p>
            Completed, planned and still-to-do mountains are shown directly on
            the map, giving your progress a visual sense of place.
          </p>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          <div className="map-toolbar">
            <div>
              <p className="section-kicker">Map filters</p>
              <h2>Filter visible pins</h2>
            </div>

            <div className="mountains-filters">
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
            </div>
          </div>

          <div className="map-layout">
            <div className="map-panel">
              {status === "loading" && <p>Loading map...</p>}
              {status === "error" && <p>Unable to load mountain map.</p>}

              {status === "success" && (
                <MapContainer
                  center={[54.6, -3.1]}
                  zoom={6}
                  scrollWheelZoom={false}
                  className="summit-map"
                >
                  <MapBounds mountains={mappableMountains} />

                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {mappableMountains.map((mountain) => {
                    const mountainStatus =
                      logStatusByMountainId[mountain.id] || "not_started";

                    return (
                      <Marker
                        key={mountain.id}
                        position={[
                          Number(mountain.latitude),
                          Number(mountain.longitude),
                        ]}
                        icon={createMarkerIcon(mountainStatus)}
                      >
                        <Popup>
                          <div className="map-popup">
                            <strong>{mountain.name}</strong>

                            <span>{getCollectionNames(mountain)}</span>
                            <span>{mountain.region?.name}</span>
                            <span>
                              Rank:{" "}
                              {getCollectionRank(
                                mountain,
                                filters.collection_memberships__collection__slug
                              )}
                            </span>
                            <span>Height: {mountain.height_m}m</span>
                            <span>
                              Prominence: {mountain.prominence_m || "—"}m
                            </span>
                            <span>Status: {getStatusLabel(mountainStatus)}</span>

                            <Link to={`/mountains/${mountain.slug}`}>
                              View mountain
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              )}
            </div>

            <aside className="map-summary-card">
              <p className="section-kicker">Visible pins</p>
              <strong>{mappableMountains.length}</strong>
              <span>mountains with coordinates</span>

              <div className="map-legend">
                <p>
                  <span className="legend-dot legend-dot--completed" />
                  Completed: {mapStats.completed}
                </p>
                <p>
                  <span className="legend-dot legend-dot--planned" />
                  Planned: {mapStats.planned}
                </p>
                <p>
                  <span className="legend-dot legend-dot--not-started" />
                  Not started: {mapStats.not_started}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MapPage;