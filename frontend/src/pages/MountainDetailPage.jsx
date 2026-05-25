import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createProgressLog,
  deleteProgressLog,
  getMountain,
  getProgressLogs,
  updateProgressLog,
  updateProgressLogWithImage,
} from "../lib/api";

const emptyForm = {
  status: "not_started",
  season: "",
  completed_date: "",
  route_taken: "",
  hike_distance_km: "",
  hike_duration_hours: "",
  steps: "",
  flights_climbed: "",
  notes: "",
  uploaded_image: "",
};

function getCollectionNames(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships
      .map((membership) => membership.collection?.name)
      .filter(Boolean)
      .join(" / ");
  }
  return mountain.collection?.name || "Unlisted";
}

function logToForm(log) {
  return {
    status: log.status || "not_started",
    season: log.season || "",
    completed_date: log.completed_date || "",
    route_taken: log.route_taken || "",
    hike_distance_km: log.hike_distance_km || "",
    hike_duration_hours: log.hike_duration_hours || "",
    steps: log.steps || "",
    flights_climbed: log.flights_climbed || "",
    notes: log.notes || "",
    uploaded_image: log.uploaded_image || "",
  };
}

function MountainDetailPage() {
  const { slug } = useParams();

  const [mountain, setMountain] = useState(null);
  const [ascents, setAscents] = useState([]);
  const [activeLogId, setActiveLogId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pageStatus, setPageStatus] = useState("loading");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    async function loadMountain() {
      try {
        const mountainData = await getMountain(slug);
        setMountain(mountainData);

        try {
          const logs = await getProgressLogs();
          const mountainLogs = logs.filter(
            (log) => log.mountain === mountainData.id
          );
          setAscents(mountainLogs);

          // Load the most recent log into the form by default
          if (mountainLogs.length > 0) {
            const latest = mountainLogs[0];
            setActiveLogId(latest.id);
            setForm(logToForm(latest));
          }
        } catch {
          // User not logged in — that's fine
        }

        setPageStatus("success");
      } catch (error) {
        console.error(error);
        setPageStatus("error");
      }
    }

    loadMountain();
  }, [slug]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    setSelectedImage(event.target.files[0] || null);
  }

  function handleSelectAscent(log) {
    setActiveLogId(log.id);
    setForm(logToForm(log));
    setSelectedImage(null);
    setSaveStatus("idle");
    setShowNewForm(false);
  }

  function handleNewAscent() {
    setActiveLogId(null);
    setForm(emptyForm);
    setSelectedImage(null);
    setSaveStatus("idle");
    setShowNewForm(true);
  }

  async function handleDeleteLog() {
    if (!activeLogId) return;
    const confirmed = window.confirm(
      "Delete this ascent log? This cannot be undone."
    );
    if (!confirmed) return;
    try {
      await deleteProgressLog(activeLogId);
      const updated = ascents.filter((a) => a.id !== activeLogId);
      setAscents(updated);
      if (updated.length > 0) {
        setActiveLogId(updated[0].id);
        setForm(logToForm(updated[0]));
      } else {
        setActiveLogId(null);
        setForm(emptyForm);
      }
      setShowNewForm(false);
      setSaveStatus("deleted");
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setSaveStatus("saving");

      const { uploaded_image, ...formWithoutImage } = form;
      const payload = {
        ...formWithoutImage,
        mountain: mountain.id,
        completed_date: form.completed_date || null,
        hike_distance_km: form.hike_distance_km || null,
        hike_duration_hours: form.hike_duration_hours || null,
        steps: form.steps || null,
        flights_climbed: form.flights_climbed || null,
      };

      const savedLog = activeLogId
        ? await updateProgressLog(activeLogId, payload)
        : await createProgressLog(payload);

      let finalLog = savedLog;

      if (selectedImage) {
        const imageFormData = new FormData();
        imageFormData.append("uploaded_image", selectedImage);
        finalLog = await updateProgressLogWithImage(savedLog.id, imageFormData);
      }

      // Update ascents list
      setAscents((current) => {
        const exists = current.find((a) => a.id === finalLog.id);
        if (exists) {
          return current.map((a) => (a.id === finalLog.id ? finalLog : a));
        }
        return [finalLog, ...current];
      });

      setActiveLogId(finalLog.id);
      setForm(logToForm(finalLog));
      setShowNewForm(false);
      setSaveStatus("saved");
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    }
  }

  if (pageStatus === "loading") return <p>Loading...</p>;
  if (pageStatus === "error") return <p>Unable to load mountain.</p>;

  const seasonLabels = {
    summer: "☀️ Summer",
    winter: "❄️ Winter",
    spring: "🌸 Spring",
    autumn: "🍂 Autumn",
  };

  return (
    <main>
      <section className="section section-dark mountain-detail-hero">
        <div className="container">
          <p className="section-kicker">
            <span className="kicker-line" />
            {getCollectionNames(mountain)}
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
            <strong>{mountain.height_ft || "—"}</strong>
          </div>
          <div className="mountain-stat-card">
            <h3>Prominence</h3>
            <strong>{mountain.prominence_m || "—"}m</strong>
          </div>
          <div className="mountain-stat-card">
            <h3>Region</h3>
            <strong>{mountain.region?.name}</strong>
          </div>
        </div>
      </section>

      <section className="section section-dark">
        <div className="container tracking-panel">
          <div>
            <p className="section-kicker">Your record</p>
            <h2>Track this summit</h2>
            <p>
              Mark this mountain as planned or completed, then add your route,
              date, distance and notes.
            </p>

            {/* Ascent history list */}
            {ascents.length > 0 && (
              <div className="ascent-history">
                <p className="ascent-history__label">
                  {ascents.length === 1
                    ? "1 ascent logged"
                    : `${ascents.length} ascents logged`}
                </p>
                <div className="ascent-history__list">
                  {ascents.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className={`ascent-history__item${activeLogId === a.id && !showNewForm ? " active" : ""}`}
                      onClick={() => handleSelectAscent(a)}
                    >
                      <span>{a.completed_date || "No date"}</span>
                      {a.season && (
                        <span className="ascent-season-badge">
                          {seasonLabels[a.season] || a.season}
                        </span>
                      )}
                      <span className={`ascent-status ascent-status--${a.status}`}>
                        {a.status.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="ascent-history__new"
                  onClick={handleNewAscent}
                >
                  + Log another ascent
                </button>
              </div>
            )}
          </div>

          <form className="tracking-form glass-card" onSubmit={handleSubmit}>
            {showNewForm && (
              <p className="tracking-form__new-label">New ascent</p>
            )}

            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="not_started">Not started</option>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>
            </label>

            <label>
              Season
              <select name="season" value={form.season} onChange={handleChange}>
                <option value="">— Select season —</option>
                <option value="summer">Summer</option>
                <option value="winter">Winter</option>
                <option value="spring">Spring</option>
                <option value="autumn">Autumn</option>
              </select>
            </label>

            <label>
              Completed date
              <input
                type="date"
                name="completed_date"
                value={form.completed_date}
                onChange={handleChange}
              />
            </label>

            <label>
              Route taken
              <input
                type="text"
                name="route_taken"
                value={form.route_taken}
                onChange={handleChange}
                placeholder="e.g. Corridor Route from Seathwaite"
              />
            </label>

            <div className="tracking-form__row">
              <label>
                Distance km
                <input
                  type="number"
                  step="0.1"
                  name="hike_distance_km"
                  value={form.hike_distance_km}
                  onChange={handleChange}
                />
              </label>
              <label>
                Duration hours
                <input
                  type="number"
                  step="0.1"
                  name="hike_duration_hours"
                  value={form.hike_duration_hours}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="tracking-form__row">
              <label>
                Steps
                <input
                  type="number"
                  name="steps"
                  value={form.steps}
                  onChange={handleChange}
                  placeholder="e.g. 14582"
                />
              </label>
              <label>
                Flights climbed
                <input
                  type="number"
                  name="flights_climbed"
                  value={form.flights_climbed}
                  onChange={handleChange}
                  placeholder="e.g. 72"
                />
              </label>
            </div>

            <label>
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows="5"
                placeholder="Weather, route condition, memories, who you walked with..."
              />
            </label>

            <label>
              Route image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            {form.uploaded_image && (
              <img
                className="tracking-form__preview"
                src={form.uploaded_image}
                alt={`${mountain.name} route upload`}
              />
            )}

            <div className="tracking-form__actions">
              <button type="submit">
                {saveStatus === "saving"
                  ? "Saving..."
                  : activeLogId
                    ? "Update ascent"
                    : "Save ascent"}
              </button>
              {activeLogId && !showNewForm && (
                <button
                  type="button"
                  className="tracking-form__delete"
                  onClick={handleDeleteLog}
                >
                  Delete log
                </button>
              )}
            </div>

            {saveStatus === "saved" && <p>Saved successfully.</p>}
            {saveStatus === "deleted" && <p>Ascent log deleted.</p>}
            {saveStatus === "error" && (
              <p>Unable to save. Make sure you are logged in.</p>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}

export default MountainDetailPage;
