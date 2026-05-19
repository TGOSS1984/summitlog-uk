import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createProgressLog,
  getMountain,
  getProgressLogs,
  updateProgressLog,
  updateProgressLogWithImage,
} from "../lib/api";

const initialForm = {
  status: "not_started",
  completed_date: "",
  route_taken: "",
  hike_distance_km: "",
  hike_duration_hours: "",
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

function MountainDetailPage() {
  const { slug } = useParams();

  const [mountain, setMountain] = useState(null);
  const [logId, setLogId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("loading");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    async function loadMountain() {
      try {
        const mountainData = await getMountain(slug);
        setMountain(mountainData);

        try {
          const logs = await getProgressLogs();
          const existingLog = logs.find(
            (log) => log.mountain === mountainData.id
          );

          if (existingLog) {
            setLogId(existingLog.id);
            setForm({
              status: existingLog.status || "not_started",
              completed_date: existingLog.completed_date || "",
              route_taken: existingLog.route_taken || "",
              hike_distance_km: existingLog.hike_distance_km || "",
              hike_duration_hours: existingLog.hike_duration_hours || "",
              notes: existingLog.notes || "",
              uploaded_image: existingLog.uploaded_image || "",
            });
          }
        } catch (error) {
          console.warn("User may not be logged in.", error);
        }

        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }

    loadMountain();
  }, [slug]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handleImageChange(event) {
    setSelectedImage(event.target.files[0] || null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaveStatus("saving");

      const payload = {
        ...form,
        mountain: mountain.id,
        completed_date: form.completed_date || null,
        hike_distance_km: form.hike_distance_km || null,
        hike_duration_hours: form.hike_duration_hours || null,
      };

      const savedLog = logId
        ? await updateProgressLog(logId, payload)
        : await createProgressLog(payload);

      setLogId(savedLog.id);
      if (selectedImage) {
        const imageFormData = new FormData();
        imageFormData.append("uploaded_image", selectedImage);

        const imageLog = await updateProgressLogWithImage(
          savedLog.id,
          imageFormData
        );

        setLogId(imageLog.id);
        setForm((currentForm) => ({
          ...currentForm,
          uploaded_image: imageLog.uploaded_image || "",
        }));
      }
      setSaveStatus("saved");
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    }
  }

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
          <p className="section-kicker">{getCollectionNames(mountain)}</p>
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
          </div>

          <form className="tracking-form glass-card" onSubmit={handleSubmit}>
            <label>
              Status
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="not_started">Not started</option>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
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

            <button type="submit">
              {saveStatus === "saving" ? "Saving..." : "Save mountain log"}
            </button>

            {saveStatus === "saved" && <p>Saved successfully.</p>}
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