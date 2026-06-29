import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  TbShare2, TbExternalLink, TbMap2, TbCompass, TbFileCode,
} from "react-icons/tb";
import {
  createProgressLog,
  deleteProgressLog,
  getCurrentUser,
  getMountain,
  getMountains,
  getProgressLogs,
  updateProgressLog,
  updateProgressLogWithImage,
} from "../lib/api";
import { ToastContainer, useToast } from "../components/ui/Toast";
import { ConfirmModal } from "../components/ui/ConfirmModal";

const emptyForm = {
  status: "not_started",
  season: "",
  conditions: "",
  completed_date: "",
  route_taken: "",
  hike_distance_km: "",
  hike_duration_hours: "",
  steps: "",
  flights_climbed: "",
  notes: "",
  uploaded_image: "",
};

const CONDITIONS_OPTIONS = [
  { value: "clear",   label: "☀️ Clear & sunny" },
  { value: "good",    label: "🌤️ Good visibility" },
  { value: "misty",   label: "🌫️ Misty / low cloud" },
  { value: "rain",    label: "🌧️ Rain / wet" },
  { value: "snow",    label: "❄️ Snow / ice" },
  { value: "winter",  label: "🏔️ Full winter conditions" },
  { value: "storm",   label: "⛈️ Storm / poor conditions" },
];

export const CONDITIONS_LABELS = Object.fromEntries(
  CONDITIONS_OPTIONS.map((o) => [o.value, o.label])
);

function getCollectionMemberships(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships
      .map((m) => ({ name: m.collection?.name, slug: m.collection?.slug }))
      .filter((m) => m.name && m.slug);
  }
  if (mountain.collection?.name) {
    return [{ name: mountain.collection.name, slug: mountain.collection.slug }];
  }
  return [];
}

function logToForm(log) {
  return {
    status:              log.status              || "not_started",
    season:              log.season              || "",
    conditions:          log.conditions          || "",
    completed_date:      log.completed_date      || "",
    route_taken:         log.route_taken         || "",
    hike_distance_km:    log.hike_distance_km    || "",
    hike_duration_hours: log.hike_duration_hours || "",
    steps:               log.steps               || "",
    flights_climbed:     log.flights_climbed     || "",
    notes:               log.notes               || "",
    uploaded_image:      log.uploaded_image      || "",
  };
}

// ── Haversine distance (km) ──────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── GPX file parser ──────────────────────────────────────────────────────────
// Parses a .gpx file client-side and returns distance_km, duration_hours,
// and a steps estimate. Returns null if parsing fails or no track points found.

function parseGpxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const doc    = new DOMParser().parseFromString(e.target.result, "text/xml");
        const trkpts = Array.from(doc.querySelectorAll("trkpt"));
        if (trkpts.length < 2) { resolve(null); return; }

        // Total distance
        let totalKm = 0;
        for (let i = 1; i < trkpts.length; i++) {
          totalKm += haversineKm(
            parseFloat(trkpts[i - 1].getAttribute("lat")),
            parseFloat(trkpts[i - 1].getAttribute("lon")),
            parseFloat(trkpts[i].getAttribute("lat")),
            parseFloat(trkpts[i].getAttribute("lon")),
          );
        }

        // Duration from <time> elements
        const times = trkpts
          .map((pt) => pt.querySelector("time")?.textContent)
          .filter(Boolean);
        let durationHours = null;
        if (times.length >= 2) {
          const ms = new Date(times[times.length - 1]) - new Date(times[0]);
          durationHours = ms > 0 ? Math.round((ms / 3600000) * 10) / 10 : null;
        }

        // Steps estimate — roughly 1300 steps/km for hiking
        const steps = Math.round(totalKm * 1300);

        resolve({
          distance_km:    Math.round(totalKm * 100) / 100,
          duration_hours: durationHours,
          steps,
        });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ── Weather helpers ──────────────────────────────────────────────────────────

function weatherDescription(code) {
  const codes = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
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

// ── Wikipedia summary ────────────────────────────────────────────────────────

// Mirrors the same landform keyword check used in the backend's
// fetch_wikipedia_summaries command — catches a real Wikipedia article
// that happens to share the mountain's exact name but is about something
// else entirely (e.g. "Pillar" the architectural element, not the fell).
const MOUNTAIN_KEYWORDS = [
  "mountain", "hill", "peak", "summit", "fell", "munro", "ridge",
  "massif", "highland", "highest point", "metres above sea level",
  "feet above sea level", "corbett", "nuttall", "elevation of",
];

function looksLikeMountain(data) {
  const haystack = `${data.description || ""} ${(data.extract || "").slice(0, 300)}`.toLowerCase();
  return MOUNTAIN_KEYWORDS.some((kw) => haystack.includes(kw));
}

async function fetchWikiSummaryData(title) {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.type === "disambiguation" || !data.extract) return null;
  return data;
}

async function searchBestWikiTitle(query) {
  // origin=* is required for the MediaWiki action API to allow a
  // cross-origin GET from the browser — the REST summary endpoint above
  // doesn't need it, but this one does.
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=3&srsearch=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const results = data?.query?.search;
  return results && results.length > 0 ? results[0].title : null;
}

// Tries the exact title first; if that's missing, ambiguous, or resolves
// to the wrong topic, falls back to a full-text search seeded with the
// region for context — same approach as the backend enrichment command,
// just run live in the browser instead of pre-computed.
async function findWikiData(mountainName, regionName) {
  const wikiName = mountainName.replace(/\s*\[.*?\]\s*/g, "").trim();

  let data = await fetchWikiSummaryData(wikiName);
  if (data && looksLikeMountain(data)) return data;

  const searchQuery = `${wikiName} mountain${regionName ? ` ${regionName}` : ""}`;
  const bestTitle = await searchBestWikiTitle(searchQuery);
  if (bestTitle) {
    data = await fetchWikiSummaryData(bestTitle);
    if (data && looksLikeMountain(data)) return data;
  }

  return null;
}

function WikiSummary({ mountainName, regionName }) {
  const [wikiData, setWikiData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!mountainName) return;
    const wikiName = mountainName.replace(/\s*\[.*?\]\s*/g, "").trim();
    // v3: bumped because matches are now content-validated with a search
    // fallback — anyone with a v2-or-earlier cached entry (including a
    // wrong-topic match like the Pillar/building mismatch) gets a fresh,
    // validated fetch instead of stale or incorrect data.
    const cacheKey = `wiki-v3-${wikiName}`;
    const cached   = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setWikiData(JSON.parse(cached)); setLoading(false); return; } catch {}
    }
    setLoading(true);
    findWikiData(mountainName, regionName)
      .then((data) => {
        if (data) {
          const result = {
            text:      data.extract,
            url:       data.content_urls?.desktop?.page,
            thumbnail: data.thumbnail?.source || null,
          };
          setWikiData(result);
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mountainName, regionName]);

  if (loading || !wikiData) return null;

  const PREVIEW_LEN = 320;
  const isLong  = wikiData.text.length > PREVIEW_LEN;
  const display = expanded || !isLong
    ? wikiData.text
    : wikiData.text.slice(0, PREVIEW_LEN).trimEnd() + "…";

  return (
    <div className="mountain-wiki">
      <div
        className="mountain-wiki__inner"
        style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-start" }}
      >
        {wikiData.thumbnail && (
          <img
            src={wikiData.thumbnail}
            alt={mountainName}
            className="mountain-wiki__thumbnail"
            style={{ width: 140, height: 140, objectFit: "cover", borderRadius: 12, flexShrink: 0 }}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        )}
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <p className="section-kicker"><span className="kicker-line" />About this mountain</p>
          <p className="mountain-wiki__text">{display}</p>
          <div className="mountain-wiki__footer">
            {isLong && (
              <button className="mountain-wiki__expand" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
            {wikiData.url && (
              <a href={wikiData.url} target="_blank" rel="noopener noreferrer" className="mountain-wiki__link">
                <TbExternalLink size={13} strokeWidth={2} /> Wikipedia
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Weather widget ───────────────────────────────────────────────────────────

function WeatherWidget({ latitude, longitude, mountainName }) {
  const [weather, setWeather] = useState(null);
  const [weatherStatus, setWeatherStatus] = useState("loading");

  useEffect(() => {
    if (!latitude || !longitude) { setWeatherStatus("unavailable"); return; }
    async function fetchWeather() {
      try {
        const url  = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_sum&timezone=Europe%2FLondon&forecast_days=4`;
        const res  = await fetch(url);
        const data = await res.json();
        const days = data.daily.time.slice(0, 4).map((date, i) => ({
          date, code: data.daily.weathercode[i],
          maxTemp: Math.round(data.daily.temperature_2m_max[i]),
          minTemp: Math.round(data.daily.temperature_2m_min[i]),
          wind:    Math.round(data.daily.windspeed_10m_max[i]),
          rain:    data.daily.precipitation_sum[i],
        }));
        setWeather(days); setWeatherStatus("success");
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
      {weatherStatus === "error"   && <p className="weather-widget__loading">Forecast unavailable.</p>}
      {weatherStatus === "success" && weather && (
        <div className="weather-days">
          {weather.map((day, i) => (
            <div key={day.date} className="weather-day">
              <p className="weather-day__label">{formatDay(day.date, i)}</p>
              <span className="weather-day__icon">{weatherEmoji(day.code)}</span>
              <p className="weather-day__desc">{weatherDescription(day.code)}</p>
              <p className="weather-day__temp"><strong>{day.maxTemp}°</strong><span>{day.minTemp}°</span></p>
              <div className="weather-day__details">
                <span>💨 {day.wind} km/h</span><span>🌧 {day.rain}mm</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Plan your ascent ─────────────────────────────────────────────────────────
// External route planning links + nearby summits in the same region.

function PlanYourAscent({ mountain, nearbyMountains }) {
  const { latitude, longitude, name, region } = mountain;
  const isScotland = region?.name?.toLowerCase().includes("scotland");

  const osUrl = latitude && longitude
    ? `https://explore.osmaps.com/?lat=${latitude}&lon=${longitude}&zoom=14&style=Standard`
    : null;
  const komootUrl       = `https://www.komoot.com/discover?q=${encodeURIComponent(name + " " + (region?.name || ""))}`;
  const walkHighlandsUrl = isScotland
    ? `https://www.walkhighlands.co.uk/walk-search.php?q=${encodeURIComponent(name)}`
    : null;

  const hasLinks   = osUrl || komootUrl || walkHighlandsUrl;
  const hasNearby  = nearbyMountains && nearbyMountains.length > 0;
  if (!hasLinks && !hasNearby) return null;

  return (
    <div className="mountain-plan">
      <p className="section-kicker"><span className="kicker-line" />Plan your ascent</p>
      <h3>Route discovery</h3>
      <p>Find routes and trail guides for {name} using these tools.</p>

      {hasLinks && (
        <div className="mountain-plan__links">
          {osUrl && (
            <a href={osUrl} target="_blank" rel="noopener noreferrer" className="mountain-plan__link">
              <span className="mountain-plan__link-icon"><TbMap2 size={18} strokeWidth={1.5} /></span>
              <span className="mountain-plan__link-body">
                <strong>OS Maps</strong>
                <small>Official Ordnance Survey mapping at this location</small>
              </span>
              <TbExternalLink size={13} strokeWidth={2} className="mountain-plan__link-ext" />
            </a>
          )}
          <a href={komootUrl} target="_blank" rel="noopener noreferrer" className="mountain-plan__link">
            <span className="mountain-plan__link-icon"><TbCompass size={18} strokeWidth={1.5} /></span>
            <span className="mountain-plan__link-body">
              <strong>Komoot</strong>
              <small>Community routes and trail guides</small>
            </span>
            <TbExternalLink size={13} strokeWidth={2} className="mountain-plan__link-ext" />
          </a>
          {walkHighlandsUrl && (
            <a href={walkHighlandsUrl} target="_blank" rel="noopener noreferrer" className="mountain-plan__link">
              <span className="mountain-plan__link-icon">🏔️</span>
              <span className="mountain-plan__link-body">
                <strong>WalkHighlands</strong>
                <small>Scottish walking guides and route descriptions</small>
              </span>
              <TbExternalLink size={13} strokeWidth={2} className="mountain-plan__link-ext" />
            </a>
          )}
        </div>
      )}

      {hasNearby && (
        <div className="mountain-nearby">
          <p className="mountain-nearby__label">
            Other summits in {region?.name} — combine into a route
          </p>
          <div className="mountain-nearby__grid">
            {nearbyMountains.map((m) => (
              <Link to={`/mountains/${m.slug}`} key={m.id} className="mountain-nearby__item">
                <strong>{m.name}</strong>
                <span>{m.height_m}m</span>
              </Link>
            ))}
          </div>
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

// ── Main page ────────────────────────────────────────────────────────────────

function MountainDetailPage() {
  const { slug } = useParams();
  const { toasts, addToast, removeToast } = useToast();

  const [mountain,        setMountain]        = useState(null);
  const [ascents,         setAscents]         = useState([]);
  const [activeLogId,     setActiveLogId]     = useState(null);
  const [form,            setForm]            = useState(emptyForm);
  const [pageStatus,      setPageStatus]      = useState("loading");
  const [saveStatus,      setSaveStatus]      = useState("idle");
  const [selectedImage,   setSelectedImage]   = useState(null);
  const [showNewForm,     setShowNewForm]     = useState(false);
  const [confirmDelete,   setConfirmDelete]   = useState(false);
  const [isLoggedIn,      setIsLoggedIn]      = useState(false);
  const [shareCopied,     setShareCopied]     = useState(false);
  const [nearbyMountains, setNearbyMountains] = useState([]);
  const [gpxHint,         setGpxHint]         = useState(null); // "Filled from GPX" or error

  // Load mountain + user data
  useEffect(() => {
    async function loadMountain() {
      try {
        const mountainData = await getMountain(slug);
        setMountain(mountainData);
        try {
          const [userData, logs] = await Promise.all([getCurrentUser(), getProgressLogs()]);
          setIsLoggedIn(!!userData?.user);
          const mountainLogs = logs.filter((log) => log.mountain === mountainData.id);
          setAscents(mountainLogs);
          if (mountainLogs.length > 0) {
            const latest = mountainLogs[0];
            setActiveLogId(latest.id);
            setForm(logToForm(latest));
          }
        } catch { setIsLoggedIn(false); }
        setPageStatus("success");
      } catch (error) {
        console.error(error);
        setPageStatus("error");
      }
    }
    loadMountain();
  }, [slug]);

  // Fetch nearby mountains once the mountain data is loaded
  useEffect(() => {
    if (!mountain?.region?.slug) return;
    getMountains({ region__slug: mountain.region.slug, page_size: 20 })
      .then((data) => {
        const list = (Array.isArray(data) ? data : data.results || [])
          .filter((m) => m.slug !== mountain.slug);

        // Sort by proximity if both have coordinates, otherwise by height desc
        const sorted = mountain.latitude && mountain.longitude
          ? list.sort((a, b) => {
              const da = (a.latitude && a.longitude)
                ? haversineKm(Number(mountain.latitude), Number(mountain.longitude), Number(a.latitude), Number(a.longitude))
                : Infinity;
              const db = (b.latitude && b.longitude)
                ? haversineKm(Number(mountain.latitude), Number(mountain.longitude), Number(b.latitude), Number(b.longitude))
                : Infinity;
              return da - db;
            })
          : list.sort((a, b) => Number(b.height_m || 0) - Number(a.height_m || 0));

        setNearbyMountains(sorted.slice(0, 6));
      })
      .catch(() => {}); // non-fatal
  }, [mountain]);

  // ── Share ──────────────────────────────────────────────────────────────────

  function handleShare() {
    const completedLog = ascents.find((a) => a.status === "completed");
    const shareUrl     = completedLog
      ? `${window.location.origin}/share/log/${completedLog.id}`
      : window.location.href;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setShareCopied(true);
        addToast(completedLog ? "Share link copied!" : "Page link copied!", "success");
        setTimeout(() => setShareCopied(false), 2500);
      });
    } else {
      const el = document.createElement("input");
      el.value = shareUrl;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
      addToast("Link copied!", "success");
    }
  }

  // ── GPX auto-fill ──────────────────────────────────────────────────────────

  async function handleGpxChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    setGpxHint("Parsing GPX…");
    try {
      const parsed = await parseGpxFile(file);
      if (!parsed) { setGpxHint("No track points found in GPX file."); return; }
      setForm((f) => ({
        ...f,
        hike_distance_km:    parsed.distance_km    !== null ? String(parsed.distance_km)    : f.hike_distance_km,
        hike_duration_hours: parsed.duration_hours !== null ? String(parsed.duration_hours) : f.hike_duration_hours,
        steps:               parsed.steps          !== null ? String(parsed.steps)          : f.steps,
      }));
      const parts = [`${parsed.distance_km}km`];
      if (parsed.duration_hours) parts.push(`${parsed.duration_hours}hrs`);
      parts.push(`~${parsed.steps.toLocaleString()} steps`);
      setGpxHint(`✓ Filled from GPX — ${parts.join(" · ")}`);
      setTimeout(() => setGpxHint(null), 6000);
    } catch {
      setGpxHint("Could not parse GPX file. Check the format and try again.");
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) { setSelectedImage(event.target.files[0] || null); }

  function handleSelectAscent(log) {
    setActiveLogId(log.id); setForm(logToForm(log)); setSelectedImage(null);
    setSaveStatus("idle"); setShowNewForm(false); setGpxHint(null);
  }

  function handleNewAscent() {
    setActiveLogId(null); setForm(emptyForm); setSelectedImage(null);
    setSaveStatus("idle"); setShowNewForm(true); setGpxHint(null);
  }

  async function handleDeleteConfirmed() {
    setConfirmDelete(false);
    try {
      await deleteProgressLog(activeLogId);
      const updated = ascents.filter((a) => a.id !== activeLogId);
      setAscents(updated);
      if (updated.length > 0) { setActiveLogId(updated[0].id); setForm(logToForm(updated[0])); }
      else { setActiveLogId(null); setForm(emptyForm); }
      setShowNewForm(false);
      addToast("Ascent log deleted.", "info");
    } catch { addToast("Could not delete log. Try again.", "error"); }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.status === "completed" && !form.completed_date) {
      addToast("Please add a completed date for completed ascents.", "error"); return;
    }
    try {
      setSaveStatus("saving");
      const { uploaded_image, ...formWithoutImage } = form;
      const payload = {
        ...formWithoutImage,
        mountain:            mountain.id,
        completed_date:      form.completed_date      || null,
        hike_distance_km:    form.hike_distance_km    || null,
        hike_duration_hours: form.hike_duration_hours || null,
        steps:               form.steps               || null,
        flights_climbed:     form.flights_climbed     || null,
        conditions:          form.conditions          || "",
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
      setActiveLogId(finalLog.id); setForm(logToForm(finalLog));
      setShowNewForm(false); setSaveStatus("idle");
      addToast(activeLogId ? "Ascent updated successfully." : "Ascent saved successfully.", "success");
    } catch {
      setSaveStatus("idle");
      addToast("Unable to save. Make sure you are logged in.", "error");
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────

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

  const seasonLabels      = { summer: "☀️ Summer", winter: "❄️ Winter", spring: "🌸 Spring", autumn: "🍂 Autumn" };
  const completedAscents  = ascents.filter((a) => a.status === "completed");
  const completedCount    = completedAscents.length;
  const dateLabelText     = form.status === "planned" ? "Target date" : "Completed date";
  const collectionMemberships = getCollectionMemberships(mountain);

  function ascentHistoryLabel() {
    if (ascents.length === 0) return null;
    if (completedCount === 0) return ascents.length === 1 ? "1 ascent logged" : `${ascents.length} ascents logged`;
    if (completedCount === 1) return ascents.length === 1 ? "Summited once" : `${ascents.length} ascents logged — summited once`;
    return `${ascents.length} ${ascents.length === 1 ? "ascent" : "ascents"} logged — summited ${completedCount} times`;
  }

  const statCards = [
    { label: "Height",     value: `${mountain.height_m}m` },
    { label: "Feet",       value: mountain.height_ft || "—" },
    { label: "Prominence", value: mountain.prominence_m ? `${mountain.prominence_m}m` : "—" },
    {
      label: "Region",
      value: mountain.region?.slug
        ? <Link to={`/regions/${mountain.region.slug}`} className="stat-card__link">{mountain.region.name}</Link>
        : mountain.region?.name || "—",
    },
    ...(mountain.rank_in_collection && collectionMemberships[0]
      ? [{ label: collectionMemberships[0].name, value: `#${mountain.rank_in_collection}` }]
      : []),
  ];

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

      {/* Hero */}
      <section className="section section-dark mountain-detail-hero">
        <div className="container">
          <p className="section-kicker">
            <span className="kicker-line" />
            {collectionMemberships.length > 0 ? (
              collectionMemberships.map((m, i) => (
                <span key={m.slug}>{i > 0 && " / "}
                  <Link to={`/collections/${m.slug}`} className="section-kicker__link">{m.name}</Link>
                </span>
              ))
            ) : "Unlisted"}
          </p>
          <div className="mountain-detail-hero__title-row">
            <h1>{mountain.name}</h1>
            <button
              className={`mountain-share-btn${shareCopied ? " mountain-share-btn--copied" : ""}`}
              onClick={handleShare}
              title={completedAscents.length > 0 ? "Share your ascent" : "Share this mountain"}
            >
              <TbShare2 size={16} strokeWidth={2} />
              {shareCopied ? "Copied!" : "Share"}
            </button>
          </div>
          <p>{mountain.summary}</p>
        </div>
      </section>

      {/* Stat cards */}
      <section className="section section-light">
        <div className="container mountain-detail-grid">
          {statCards.map((card) => (
            <div className="mountain-stat-card" key={card.label}>
              <h3>{card.label}</h3>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </section>

      {/* Wikipedia */}
      <section className="section section-light" style={{ paddingTop: 0 }}>
        <div className="container">
          <WikiSummary mountainName={mountain.name} regionName={mountain.region?.name} />
        </div>
      </section>

      {/* Weather */}
      {mountain.latitude && mountain.longitude && (
        <section className="section section-light" style={{ paddingTop: 0 }}>
          <div className="container">
            <WeatherWidget latitude={mountain.latitude} longitude={mountain.longitude} mountainName={mountain.name} />
          </div>
        </section>
      )}

      {/* Plan your ascent — route discovery */}
      <section className="section section-light" style={{ paddingTop: 0 }}>
        <div className="container">
          <PlanYourAscent mountain={mountain} nearbyMountains={nearbyMountains} />
        </div>
      </section>

      {/* Tracking panel */}
      <section className="section section-dark">
        <div className="container tracking-panel">
          <div>
            <p className="section-kicker">Your record</p>
            <h2>Track this summit</h2>
            <p>Mark this mountain as planned or completed, then add your route, date, distance and notes.</p>

            {isLoggedIn && ascents.length > 0 && (
              <div className="ascent-history">
                <p className="ascent-history__label">{ascentHistoryLabel()}</p>
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

              <div className="tracking-form__row">
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
                {form.status === "completed" && (
                  <label>
                    Conditions
                    <select name="conditions" value={form.conditions} onChange={handleChange}>
                      <option value="">— Select conditions —</option>
                      {CONDITIONS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label>
                {dateLabelText}
                {form.status === "completed" && !form.completed_date && (
                  <span className="field-hint field-hint--required">Required for completed ascents</span>
                )}
                <input type="date" name="completed_date" value={form.completed_date} onChange={handleChange} />
              </label>

              <label>
                Route taken
                <input type="text" name="route_taken" value={form.route_taken} onChange={handleChange} placeholder="e.g. Corridor Route from Seathwaite" />
              </label>

              {/* GPX upload — auto-fills distance, duration, steps */}
              <div className="tracking-form__gpx">
                <label className="tracking-form__gpx-label">
                  <TbFileCode size={15} strokeWidth={2} />
                  Import from GPX
                  <span className="field-hint">Auto-fills distance, duration and steps</span>
                  <input type="file" accept=".gpx,application/gpx+xml" onChange={handleGpxChange} className="tracking-form__gpx-input" />
                </label>
                {gpxHint && (
                  <p className={`tracking-form__gpx-hint${gpxHint.startsWith("✓") ? " tracking-form__gpx-hint--success" : " tracking-form__gpx-hint--error"}`}>
                    {gpxHint}
                  </p>
                )}
              </div>

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


