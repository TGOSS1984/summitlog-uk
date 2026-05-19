import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { getMountains, getProgressLogs } from "../lib/api";

function createMarkerIcon(status) {
  return L.divIcon({
    className: `summit-marker summit-marker--${status}`,
    html: "<span></span>",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function MapPage() {
  const [mountains, setMountains] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMapData() {
      try {
        const mountainData = await getMountains();
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
  }, []);

  const logStatusByMountainId = useMemo(() => {
    return logs.reduce((lookup, log) => {
      lookup[log.mountain] = log.status;
      return lookup;
    }, {});
  }, [logs]);

  const mappableMountains = mountains.filter(
    (mountain) => mountain.latitude && mountain.longitude
  );

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
        <div className="container map-layout">
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
                        <strong>{mountain.name}</strong>
                        <br />
                        {mountain.height_m}m
                        <br />
                        Status: {mountainStatus.replace("_", " ")}
                        <br />
                        <Link to={`/mountains/${mountain.slug}`}>
                          View mountain
                        </Link>
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
      </section>
    </main>
  );
}

export default MapPage;