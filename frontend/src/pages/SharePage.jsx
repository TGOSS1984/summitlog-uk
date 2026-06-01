import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TbMountain, TbRoute, TbWalk, TbCalendar, TbStairs, TbShare2 } from "react-icons/tb";

const CONDITIONS_LABELS = {
  clear:  "☀️ Clear & sunny",
  good:   "🌤️ Good visibility",
  misty:  "🌫️ Misty / low cloud",
  rain:   "🌧️ Rain / wet",
  snow:   "❄️ Snow / ice",
  winter: "🏔️ Full winter conditions",
  storm:  "⛈️ Storm / poor conditions",
};

const SEASON_LABELS = {
  summer: "☀️ Summer",
  winter: "❄️ Winter",
  spring: "🌸 Spring",
  autumn: "🍂 Autumn",
};

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function SharePage() {
  const { id }   = useParams();
  const [log,    setLog]    = useState(null);
  const [status, setStatus] = useState("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/progress/share/log/${id}/`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        setLog(data);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }
    load();
  }, [id]);

  function handleCopy() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (status === "loading") {
    return (
      <main>
        <div className="skeleton-hero" />
        <section className="section section-light">
          <div className="container">
            <div className="skeleton-card" style={{ height: 200 }} />
          </div>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main>
        <section className="section section-dark" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
          <div className="container" style={{ textAlign: "center" }}>
            <TbMountain size={52} strokeWidth={1} style={{ color: "rgba(208,170,98,0.4)", margin: "0 auto 1rem" }} />
            <p className="section-kicker" style={{ justifyContent: "center" }}>Not found</p>
            <h1>This ascent log isn't available</h1>
            <p style={{ color: "rgba(248,250,252,0.6)", marginTop: "1rem" }}>
              It may have been deleted or isn't set to completed.
            </p>
            <Link to="/" className="button-primary" style={{ marginTop: "2rem", display: "inline-flex" }}>
              Back to SummitLog
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const mountain = log.mountain_detail;

  return (
    <main>
      {/* Hero */}
      <section className="section section-dark mountain-detail-hero">
        <div className="container">
          <p className="section-kicker">
            <span className="kicker-line" />
            Summit ascent
          </p>
          <h1>{mountain?.name}</h1>
          {mountain?.summary && <p style={{ color: "rgba(248,250,252,0.72)", marginTop: "0.75rem" }}>{mountain.summary}</p>}
        </div>
      </section>

      {/* Stat cards */}
      <section className="section section-light">
        <div className="container mountain-detail-grid">
          <div className="mountain-stat-card">
            <h3>Height</h3>
            <strong>{mountain?.height_m}m</strong>
          </div>
          <div className="mountain-stat-card">
            <h3>Region</h3>
            <strong>{mountain?.region?.name || "—"}</strong>
          </div>
          {log.completed_date && (
            <div className="mountain-stat-card">
              <h3>Summited</h3>
              <strong style={{ fontSize: "1.1rem" }}>{formatDate(log.completed_date)}</strong>
            </div>
          )}
          {log.season && (
            <div className="mountain-stat-card">
              <h3>Season</h3>
              <strong>{SEASON_LABELS[log.season] || log.season}</strong>
            </div>
          )}
        </div>
      </section>

      {/* Ascent detail card */}
      <section className="section section-light" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="share-card">

            <div className="share-card__header">
              <div className="share-card__badge">
                <TbMountain size={18} strokeWidth={1.5} />
                Completed ascent
              </div>
              <button
                className={`share-card__copy${copied ? " share-card__copy--copied" : ""}`}
                onClick={handleCopy}
              >
                <TbShare2 size={14} strokeWidth={2} />
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>

            {/* Stats row */}
            {(log.hike_distance_km || log.hike_duration_hours || log.steps || log.flights_climbed) && (
              <div className="share-card__stats">
                {log.hike_distance_km && (
                  <div className="share-card__stat">
                    <TbRoute size={18} strokeWidth={1.5} />
                    <strong>{Number(log.hike_distance_km).toFixed(1)}km</strong>
                    <span>Distance</span>
                  </div>
                )}
                {log.hike_duration_hours && (
                  <div className="share-card__stat">
                    <TbCalendar size={18} strokeWidth={1.5} />
                    <strong>{Number(log.hike_duration_hours)}hrs</strong>
                    <span>Duration</span>
                  </div>
                )}
                {log.steps && (
                  <div className="share-card__stat">
                    <TbWalk size={18} strokeWidth={1.5} />
                    <strong>{Number(log.steps).toLocaleString()}</strong>
                    <span>Steps</span>
                  </div>
                )}
                {log.flights_climbed && (
                  <div className="share-card__stat">
                    <TbStairs size={18} strokeWidth={1.5} />
                    <strong>{log.flights_climbed}</strong>
                    <span>Flights</span>
                  </div>
                )}
              </div>
            )}

            {/* Conditions */}
            {log.conditions && (
              <div className="share-card__conditions">
                {CONDITIONS_LABELS[log.conditions] || log.conditions}
              </div>
            )}

            {/* Route */}
            {log.route_taken && (
              <p className="share-card__route">
                <TbRoute size={14} strokeWidth={1.8} />
                {log.route_taken}
              </p>
            )}

            {/* Photo */}
            {log.uploaded_image && (
              <img
                className="share-card__image"
                src={log.uploaded_image}
                alt={`${mountain?.name} summit photo`}
              />
            )}

            {/* Notes — only if they have content */}
            {log.notes && (
              <blockquote className="share-card__notes">{log.notes}</blockquote>
            )}

            {/* CTA */}
            <div className="share-card__cta">
              <p>Track your own UK mountain adventures</p>
              <Link to="/" className="button-primary">Explore SummitLog UK</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default SharePage;
