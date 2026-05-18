import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getMountain } from "../lib/api";

function MountainDetailPage() {
  const { slug } = useParams();

  const [mountain, setMountain] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMountain() {
      try {
        const data = await getMountain(slug);
        setMountain(data);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }

    loadMountain();
  }, [slug]);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (status === "error") {
    return <p>Unable to load mountain.</p>;
  }

  return (
    <main>
      <section className="section section-dark mountain-detail-hero">
        <div className="container">
          <p className="section-kicker">
            {mountain.collection?.name}
          </p>

          <h1>{mountain.name}</h1>

          <p>{mountain.summary}</p>
        </div>
      </section>

      <section className="section section-light">
        <div className="container mountain-detail-grid">

          <div className="mountain-stat-card">
            <h3>Height</h3>
            <strong>{mountain.height_m}m</strong>
          </div>

          <div className="mountain-stat-card">
            <h3>Feet</h3>
            <strong>{mountain.height_ft}</strong>
          </div>

          <div className="mountain-stat-card">
            <h3>Prominence</h3>
            <strong>{mountain.prominence_m}m</strong>
          </div>

          <div className="mountain-stat-card">
            <h3>Region</h3>
            <strong>{mountain.region?.name}</strong>
          </div>

        </div>
      </section>
    </main>
  );
}

export default MountainDetailPage;