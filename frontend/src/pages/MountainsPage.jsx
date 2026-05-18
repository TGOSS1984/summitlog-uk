import { useEffect, useState } from "react";
import { getMountains } from "../lib/api";

function MountainsPage() {
  const [mountains, setMountains] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadMountains() {
      try {
        const data = await getMountains();
        setMountains(Array.isArray(data) ? data : data.results || []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }

    loadMountains();
  }, []);

  return (
    <main className="page">
      <section className="section section-light">
        <div className="container">
          <p className="section-kicker">Explore</p>
          <h1>Mountains</h1>
          <p>Mountain lists and filters will be built here.</p>

          {status === "loading" && <p>Loading mountains...</p>}

          {status === "error" && (
            <p>Unable to load mountains. Check the Django server is running.</p>
          )}

          {status === "success" && (
            <ul>
              {mountains.map((mountain) => (
                <li key={mountain.id}>
                  {mountain.name} — {mountain.height_m}m
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

export default MountainsPage;