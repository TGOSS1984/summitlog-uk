import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { Link } from "react-router-dom";
import { getMountains } from "../lib/api";

function MapPage() {
  const [mountains, setMountains] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMountains() {
      try {
        const data = await getMountains();
        console.log(data);
        setMountains(Array.isArray(data) ? data : data.results || []);
        setStatus("success");
      } catch (error) {
          console.error("MAP ERROR:", error);
          setStatus("error");
      }
    }

    loadMountains();
  }, []);

  const mappableMountains = mountains.filter(
    (mountain) => mountain.latitude && mountain.longitude
  );

  return (
    <main>
      <section className="section section-dark map-hero">
        <div className="container">
          <p className="section-kicker">Map</p>
          <h1>Explore the mountains by location.</h1>
          <p>
            A map-led way to browse summits across the UK, ready for completed,
            planned and still-to-do markers.
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

                {mappableMountains.map((mountain) => (
                  <Marker
                    key={mountain.id}
                    position={[
                      Number(mountain.latitude),
                      Number(mountain.longitude),
                    ]}
                  >
                    <Popup>
                      <strong>{mountain.name}</strong>
                      <br />
                      {mountain.height_m}m
                      <br />
                      <Link to={`/mountains/${mountain.slug}`}>
                        View mountain
                      </Link>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>

          <aside className="map-summary-card">
            <p className="section-kicker">Visible pins</p>
            <strong>{mappableMountains.length}</strong>
            <span>mountains with coordinates</span>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default MapPage;