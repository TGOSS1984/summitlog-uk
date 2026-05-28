import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createProgressLog,
  deleteProgressLog,
  getCurrentUser,
  getMountain,
  getProgressLogs,
  updateProgressLog,
  updateProgressLogWithImage,
} from "../lib/api";
import { ToastContainer, useToast } from "../components/ui/Toast";
import { ConfirmModal } from "../components/ui/ConfirmModal";

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

function weatherDescription(code) {
  const codes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Heavy thunderstorm",
  };
  return codes[code] ?? "Unknown";
}

function weatherEmoji(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

function WeatherWidget({ latitude, longitude, mountainName }) {
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("loading");

  useEffect(() => {
    if (!latitude || !longitude) { setWeatherStatus("unavailable"); return; }
    async function fetchWeather() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_sum&timezone=Europe%2FLondon&forecast_days=4`;
        const res = await fetch(url);
        const data = await res.json();
        const days = data.daily.time.slice(0, 4).map((date, i) => ({
          date,
          code: data.daily.weathercode[i],
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          wind: Math.round(data.daily.windspeed_10m_max[i]),
          rain: data.daily.precipitation_sum[i],
        }));
        setWeather(days);
        setWeatherStatus("success");
      } catch { setWeatherStatus("error"); }
    }
    fetchWeather();
  }, [latitude, longitude]);

  function formatDay(dateStr, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }

  if (weatherStatus === "unavailable") return null;

  return (
    <div className="weather-widget">
      <p className="section-kicker"><span className="kicker-line" />Mountain forecast</p>
      <h3>Weather at {mountainName}</h3>
      <p className="weather-widget__sub">4-day forecast via Open-Meteo</p>
      {weatherStatus === "loading" && <p className="weather-widget__loading">Loading forecast...</p>}
      {weatherStatus === "error" && <p className="weather-widget__loading">Forecast unavailable.</p>}
      {weatherStatus === "success" && weather && (
        <div className="weather-days">
          {weather.map((day, i) => (
            <div key={day.date} className="weather-day">
              <p className="weather-day__label">{formatDay(day.date, i)}</p>
              <span className="weather-day__icon">{weatherEmoji(day.code)}</span>
              <p className="weather-day__desc">{weatherDescription(day.code)}</p>
              <p className="weather-day__temp">
                <strong>{day.maxTemp}°</strong>
                <span>{day.minTemp}°</span>
              </p>
              <div className="weather-day__details">
                <span>💨 {day.wind} km/h</span>
                <span>🌧 {day.rain}mm</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginPrompt({ mountainName }) {
  return (
    <div className="tracking-login-prompt glass-card">
      <p className="section-kicker"><span className="kicker-line" />Track this summit</p>
      <h3>Sign in to log {mountainName}</h3>
      <p>Create a free account to track your ascents, log routes, distances and notes for every mountain.</p>
      <div className="tracking-login-prompt__actions">
        <Link to="/account" className="button-primary">Sign in</Link>
        <Link to="/account" className="button-secondary">Create account</Link>
      </div>
    </div>
  );
}

function MountainDetailPage() {
  const { slug } = useParams();
  const { toasts, addToast, removeToast } = useToast();

  const [mountain, setMountain] = useState(null);
  const [ascents, setAscents] = useState([]);
  const [activeLogId, setActiveLogId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [pageStatus, setPageStatus] = useState("loading");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [selectedImage, setSelectedImage] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadMountain() {
      try {
        const mountainData = await getMountain(slug);
        setMountain(mountainData);
        try {
          // Check auth and load logs in parallel
          const [userData, logs] = await Promise.all([
            getCurrentUser(),
            getProgressLogs(),
          ]);
          setIsLoggedIn(!!userData?.user);
          const mountainLogs = logs.filter((log) => log.mountain === mountainData.id);
          setAscents(mountainLogs);
          if (mountainLogs.length > 0) {
            const latest = mountainLogs[0];
            setActiveLogId(latest.id);
            setForm(logToForm(latest));
          }
        } catch {
          setIsLoggedIn(false);
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

  async function handleDeleteConfirmed() {
    setConfirmDelete(false);
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
      addToast("Ascent log deleted.", "info");
    } catch {
      addToast("Could not delete log. Try again.", "error");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (form.status === "completed" && !form.completed_date) {
      addToast("Please add a completed date for completed ascents.", "error");
      return;
    }

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

      setAscents((current) => {
        const exists = current.find((a) => a.id === finalLog.id);
        if (exists) return current.map((a) => (a.id === finalLog.id ? finalLog : a));
        return [finalLog, ...current];
      });

      setActiveLogId(finalLog.id);
      setForm(logToForm(finalLog));
      setShowNewForm(false);
      setSaveStatus("idle");
      addToast(activeLogId ? "Ascent updated successfully." : "Ascent saved successfully.", "success");
    } catch {
      setSaveStatus("idle");
      addToast("Unable to save. Make sure you are logged in.", "error");
    }
  }

  if (pageStatus === "loading") {
    return (
      <main>
        <div className="skeleton-hero" />
        <section className="section section-light">
          <div className="container mountain-detail-grid">
            {[1,2,3,4].map((i) => <div key={i} className="skeleton-card" />)}
          </div>
        </section>
      </main>
    );
  }

  if (pageStatus === "error") {
    return (
      <main>
        <section className="section section-dark">
          <div className="container">
            <p className="section-kicker">Error</p>
            <h1>Unable to load mountain</h1>
            <p>Check the server is running and try again.</p>
          </div>
        </section>
      </main>
    );
  }

  const seasonLabels = {
    summer: "☀️ Summer", winter: "❄️ Winter",
    spring: "🌸 Spring", autumn: "🍂 Autumn",
  };

  return (
    <main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {confirmDelete && (
        <ConfirmModal
          title="Delete ascent log"
          message="Are you sure you want to delete this ascent log? This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Keep it"
          danger
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

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
          <div className="mountain-stat-card"><h3>Height</h3><strong>{mountain.height_m}m</strong></div>
          <div className="mountain-stat-card"><h3>Feet</h3><strong>{mountain.height_ft || "—"}</strong></div>
          <div className="mountain-stat-card"><h3>Prominence</h3><strong>{mountain.prominence_m || "—"}m</strong></div>
          <div className="mountain-stat-card"><h3>Region</h3><strong>{mountain.region?.name}</strong></div>
        </div>
      </section>

      {mountain.latitude && mountain.longitude && (
        <section className="section section-light" style={{ paddingTop: 0 }}>
          <div className="container">
            <WeatherWidget latitude={mountain.latitude} longitude={mountain.longitude} mountainName={mountain.name} />
          </div>
        </section>
      )}

      <section className="section section-dark">
        <div className="container tracking-panel">
          <div>
            <p className="section-kicker">Your record</p>
            <h2>Track this summit</h2>
            <p>Mark this mountain as planned or completed, then add your route, date, distance and notes.</p>

            {isLoggedIn && ascents.length > 0 && (
              <div className="ascent-history">
                <p className="ascent-history__label">
                  {ascents.length === 1 ? "1 ascent logged" : `${ascents.length} ascents logged`}
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
                      {a.season && <span className="ascent-season-badge">{seasonLabels[a.season] || a.season}</span>}
                      <span className={`ascent-status ascent-status--${a.status}`}>{a.status.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
                <button type="button" className="ascent-history__new" onClick={handleNewAscent}>
                  + Log another ascent
                </button>
              </div>
            )}
          </div>

          {/* Show login prompt for unauthenticated users, form for logged-in */}
          {!isLoggedIn ? (
            <LoginPrompt mountainName={mountain.name} />
          ) : (
            <form className="tracking-form glass-card" onSubmit={handleSubmit}>
              {showNewForm && <p className="tracking-form__new-label">New ascent</p>}

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
                {form.status === "completed" && !form.completed_date && (
                  <span className="field-hint field-hint--required">Required for completed ascents</span>
                )}
                <input type="date" name="completed_date" value={form.completed_date} onChange={handleChange} />
              </label>

              <label>
                Route taken
                <input type="text" name="route_taken" value={form.route_taken} onChange={handleChange} placeholder="e.g. Corridor Route from Seathwaite" />
              </label>

              <div className="tracking-form__row">
                <label>Distance km<input type="number" step="0.1" name="hike_distance_km" value={form.hike_distance_km} onChange={handleChange} /></label>
                <label>Duration hours<input type="number" step="0.1" name="hike_duration_hours" value={form.hike_duration_hours} onChange={handleChange} /></label>
              </div>

              <div className="tracking-form__row">
                <label>Steps<input type="number" name="steps" value={form.steps} onChange={handleChange} placeholder="e.g. 14582" /></label>
                <label>Flights climbed<input type="number" name="flights_climbed" value={form.flights_climbed} onChange={handleChange} placeholder="e.g. 72" /></label>
              </div>

              <label>
                Notes
                <textarea name="notes" value={form.notes} onChange={handleChange} rows="5" placeholder="Weather, route condition, memories, who you walked with..." />
              </label>

              <label>
                Route image
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>

              {form.uploaded_image && (
                <img className="tracking-form__preview" src={form.uploaded_image} alt={`${mountain.name} route upload`} />
              )}

              <div className="tracking-form__actions">
                <button type="submit" disabled={saveStatus === "saving"}>
                  {saveStatus === "saving" ? "Saving..." : activeLogId ? "Update ascent" : "Save ascent"}
                </button>
                {activeLogId && !showNewForm && (
                  <button type="button" className="tracking-form__delete" onClick={() => setConfirmDelete(true)}>
                    Delete log
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

export default MountainDetailPage;
