import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  TbMountain, TbRoute, TbSearch, TbX, TbCheck,
  TbArrowUp, TbStar, TbChevronRight, TbPlus,
} from "react-icons/tb";
import { createRouteLog, getCurrentUser, searchMountains } from "../lib/api";
import { ToastContainer, useToast } from "../components/ui/Toast";

// ── Mountain search with debounce ───────────────────────────────────────────

function MountainSearch({ onAdd, selectedIds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMountains(query);
        const list = Array.isArray(data) ? data : data.results || [];
        setResults(list.filter((m) => !selectedIds.has(m.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(timerRef.current);
  }, [query, selectedIds]);

  function handleAdd(mountain) {
    onAdd(mountain);
    setQuery("");
    setResults([]);
  }

  return (
    <div className="route-search">
      <div className="route-search__input-wrap">
        <TbSearch size={16} strokeWidth={2} className="route-search__icon" />
        <input
          type="text"
          placeholder="Search for a mountain to add…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="route-search__input"
          autoComplete="off"
        />
        {searching && <span className="route-search__spinner" />}
      </div>
      {results.length > 0 && (
        <ul className="route-search__results">
          {results.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="route-search__result"
                onClick={() => handleAdd(m)}
              >
                <span className="route-search__result-name">{m.name}</span>
                <span className="route-search__result-meta">
                  {m.height_m}m · {m.region?.name}
                </span>
                <TbPlus size={14} strokeWidth={2.5} className="route-search__result-add" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Selected mountain list ───────────────────────────────────────────────────

function SelectedMountainList({ mountains, primaryId, onSetPrimary, onRemove }) {
  if (mountains.length === 0) {
    return (
      <div className="route-mountain-empty">
        <TbMountain size={32} strokeWidth={1} />
        <p>No mountains added yet. Search above to build your route.</p>
      </div>
    );
  }

  const sorted = [...mountains].sort((a, b) => {
    if (a.id === primaryId) return -1;
    if (b.id === primaryId) return 1;
    return Number(b.height_m || 0) - Number(a.height_m || 0);
  });

  return (
    <ul className="route-mountain-list">
      {sorted.map((m, index) => {
        const isPrimary = m.id === primaryId;
        return (
          <li
            key={m.id}
            className={`route-mountain-item${isPrimary ? " route-mountain-item--primary" : ""}`}
          >
            <div className="route-mountain-item__rank">
              {isPrimary ? <TbStar size={14} strokeWidth={2.5} /> : <span>{index + 1}</span>}
            </div>
            <div className="route-mountain-item__info">
              <strong>{m.name}</strong>
              <small>{m.height_m}m · {m.region?.name}</small>
              {m.collection_memberships?.[0]?.collection?.name && (
                <small className="route-mountain-item__collection">
                  {m.collection_memberships[0].collection.name}
                </small>
              )}
            </div>
            <div className="route-mountain-item__actions">
              {!isPrimary && (
                <button
                  type="button"
                  className="route-mountain-item__primary-btn"
                  onClick={() => onSetPrimary(m.id)}
                  title="Set as primary summit"
                >
                  <TbArrowUp size={13} strokeWidth={2} />
                  Set primary
                </button>
              )}
              {isPrimary && (
                <span className="route-mountain-item__primary-label">Primary</span>
              )}
              <button
                type="button"
                className="route-mountain-item__remove"
                onClick={() => onRemove(m.id)}
                title="Remove from route"
              >
                <TbX size={14} strokeWidth={2.5} />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const emptyForm = {
  name: "",
  description: "",
  completed_date: "",
  season: "",
  route_taken: "",
  hike_distance_km: "",
  hike_duration_hours: "",
  steps: "",
  flights_climbed: "",
  notes: "",
};

function LogRoutePage() {
  const navigate = useNavigate();
  const { toasts, addToast, removeToast } = useToast();

  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [mountains, setMountains] = useState([]);
  const [primaryId, setPrimaryId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");

  useEffect(() => {
    getCurrentUser()
      .then((data) => setIsLoggedIn(!!data?.user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function handleAddMountain(mountain) {
    setMountains((prev) => {
      const updated = [...prev, mountain];
      const highest = updated.reduce(
        (h, m) => (Number(m.height_m) > Number(h.height_m || 0) ? m : h),
        updated[0],
      );
      setPrimaryId(highest.id);
      return updated;
    });
  }

  function handleRemoveMountain(id) {
    setMountains((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      if (primaryId === id && updated.length > 0) {
        const highest = updated.reduce(
          (h, m) => (Number(m.height_m) > Number(h.height_m || 0) ? m : h),
          updated[0],
        );
        setPrimaryId(highest.id);
      } else if (updated.length === 0) {
        setPrimaryId(null);
      }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (mountains.length < 2) { addToast("Add at least 2 mountains to log a route.", "error"); return; }
    if (!primaryId) { addToast("Select a primary summit to store your cumulative stats.", "error"); return; }
    if (!form.name.trim()) { addToast("Give your route a name.", "error"); return; }
    if (!form.completed_date) { addToast("Add the date you completed this route.", "error"); return; }

    try {
      setSaveStatus("saving");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        completed_date: form.completed_date,
        season: form.season || "",
        mountain_ids: mountains.map((m) => m.id),
        primary_mountain_id: primaryId,
        route_taken: form.route_taken.trim(),
        hike_distance_km: form.hike_distance_km ? Number(form.hike_distance_km) : null,
        hike_duration_hours: form.hike_duration_hours ? Number(form.hike_duration_hours) : null,
        steps: form.steps ? Number(form.steps) : null,
        flights_climbed: form.flights_climbed ? Number(form.flights_climbed) : null,
        notes: form.notes.trim(),
      };
      const result = await createRouteLog(payload);
      setSaveStatus("success");
      addToast(result.message || `Route logged — ${result.mountains_count} summits completed.`, "success");
      setTimeout(() => navigate("/journal"), 1800);
    } catch (err) {
      setSaveStatus("idle");
      addToast(err.message || "Unable to save route. Try again.", "error");
    }
  }

  if (isLoggedIn === null) {
    return <main><div className="skeleton-hero" /></main>;
  }

  if (isLoggedIn === false) {
    return (
      <main>
        <section className="section section-dark log-route-hero">
          <div className="container">
            <p className="section-kicker"><span className="kicker-line" />Log a route</p>
            <h1 className="page-hero__h1">
              <span className="page-hero__h1-top">Multi-mountain</span>
              <span className="page-hero__h1-bottom">Route log.</span>
            </h1>
          </div>
        </section>
        <section className="section section-dark">
          <div className="container">
            <div className="tracking-login-prompt glass-card" style={{ maxWidth: 480 }}>
              <p className="section-kicker"><span className="kicker-line" />Sign in required</p>
              <h3>Sign in to log a route</h3>
              <p>Create a free account to log multi-mountain routes and track your progress.</p>
              <div className="tracking-login-prompt__actions">
                <Link to="/account" className="button-primary">Sign in</Link>
                <Link to="/account" className="button-secondary">Create account</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const selectedIds = new Set(mountains.map((m) => m.id));
  const primaryMountain = mountains.find((m) => m.id === primaryId);

  return (
    <main className="log-route-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Hero */}
      <section className="section section-dark log-route-hero">
        <div className="container">
          <p className="section-kicker"><span className="kicker-line" />Log a route</p>
          <h1 className="page-hero__h1">
            <span className="page-hero__h1-top">Multi-mountain</span>
            <span className="page-hero__h1-bottom">Route log.</span>
          </h1>
          <p>
            Log an entire route in one go — the Fairfield Horseshoe, a Munro round,
            a ridge walk. Each summit is ticked off individually and your cumulative
            stats are stored on the highest peak.
          </p>
        </div>
      </section>

      {/* How it works — dark strip */}
      <div className="route-explainer-strip">
        <div className="container">
          <div className="route-explainer">
            {[
              { n: 1, title: "Name your route", desc: "Give the walk a name and date." },
              { n: 2, title: "Add mountains",   desc: "Search and add every summit you crossed." },
              { n: 3, title: "Set primary",      desc: "Highest peak carries your total stats." },
              { n: 4, title: "Log it",           desc: "All summits marked completed instantly." },
            ].map((step, i, arr) => (
              <>
                <div key={step.n} className="route-explainer__step">
                  <span className="route-explainer__num">{step.n}</span>
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
                {i < arr.length - 1 && (
                  <TbChevronRight key={`arrow-${i}`} size={18} className="route-explainer__arrow" />
                )}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Main form — full dark section matching mountain detail */}
      <section className="section section-dark">
        <div className="container tracking-panel">

          {/* LEFT — Route details (same width/position as mountain detail left col) */}
          <div>
            <p className="section-kicker"><span className="kicker-line" />Route details</p>
            <h2>About this route</h2>
            <p style={{ color: "rgba(248,250,252,0.72)", marginTop: "var(--space-md)", maxWidth: 520 }}>
              Fill in the route name and date, then build your summit list on the right.
              Cumulative stats are stored on the primary summit only.
            </p>

            {/* Primary summit note — shown once mountains are selected */}
            {primaryMountain && (
              <div className="ascent-history" style={{ marginTop: "var(--space-xl)" }}>
                <p className="ascent-history__label">
                  Primary summit — stats stored here
                </p>
                <div className="route-primary-summit-chip">
                  <TbStar size={13} strokeWidth={2.5} />
                  <strong>{primaryMountain.name}</strong>
                  <span>{primaryMountain.height_m}m</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "rgba(248,250,252,0.45)", marginTop: "0.5rem" }}>
                  {mountains.length} summit{mountains.length !== 1 ? "s" : ""} on this route.
                  All will be marked completed on {form.completed_date || "the date above"}.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT — Glass card form (same as tracking-form glass-card) */}
          <form className="tracking-form glass-card route-tracking-form" onSubmit={handleSubmit}>

            {/* Route metadata */}
            <label>
              Route name
              {!form.name && <span className="field-hint field-hint--required">Required</span>}
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Fairfield Horseshoe"
              />
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Optional notes about this route…"
              />
            </label>

            <div className="tracking-form__row">
              <label>
                Date completed
                {!form.completed_date && <span className="field-hint field-hint--required">Required</span>}
                <input
                  type="date"
                  name="completed_date"
                  value={form.completed_date}
                  onChange={handleChange}
                />
              </label>
              <label>
                Season
                <select name="season" value={form.season} onChange={handleChange}>
                  <option value="">— Select season —</option>
                  <option value="summer">☀️ Summer</option>
                  <option value="winter">❄️ Winter</option>
                  <option value="spring">🌸 Spring</option>
                  <option value="autumn">🍂 Autumn</option>
                </select>
              </label>
            </div>

            <label>
              Route taken
              <input
                type="text"
                name="route_taken"
                value={form.route_taken}
                onChange={handleChange}
                placeholder="e.g. Rydal → Fairfield → Dove Crag → Ambleside"
              />
            </label>

            {/* Mountain builder — embedded in the glass card */}
            <div className="route-inline-builder">
                <p className="route-inline-builder__label">
                    Mountains on this route
                    {mountains.length > 0 && (
                    <span className="route-inline-builder__count">{mountains.length} added</span>
                    )}
                </p>
                {mountains.length < 2 && (
                    <p className="route-inline-builder__hint">
                    Add at least 2 summits. To log a single mountain, open it from the{" "}
                    <Link to="/mountains">Mountains page</Link> and use the tracking form there.
                    </p>
                )}
              <MountainSearch onAdd={handleAddMountain} selectedIds={selectedIds} />
              <SelectedMountainList
                mountains={mountains}
                primaryId={primaryId}
                onSetPrimary={setPrimaryId}
                onRemove={handleRemoveMountain}
              />
            </div>

            {/* Cumulative stats */}
            <p className="route-stats-heading">
              <span className="kicker-line" />
              Cumulative stats
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(248,250,252,0.5)", marginTop: "-0.5rem" }}>
              Totals for the whole route — stored on the primary summit only.
            </p>

            <div className="tracking-form__row">
              <label>
                Distance km
                <input type="number" step="0.1" name="hike_distance_km" value={form.hike_distance_km} onChange={handleChange} placeholder="e.g. 15.2" />
              </label>
              <label>
                Duration hours
                <input type="number" step="0.1" name="hike_duration_hours" value={form.hike_duration_hours} onChange={handleChange} placeholder="e.g. 7.5" />
              </label>
            </div>

            <div className="tracking-form__row">
              <label>
                Steps
                <input type="number" name="steps" value={form.steps} onChange={handleChange} placeholder="e.g. 28000" />
              </label>
              <label>
                Flights climbed
                <input type="number" name="flights_climbed" value={form.flights_climbed} onChange={handleChange} placeholder="e.g. 86" />
              </label>
            </div>

            <label>
              Notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Weather, conditions, who you walked with…"
              />
            </label>

            <div className="tracking-form__actions">
              <button
                type="submit"
                disabled={saveStatus === "saving" || saveStatus === "success" || mountains.length < 2}
                title={mountains.length < 2 ? "Add at least 2 mountains to log a route" : undefined}
                >
                {saveStatus === "saving" && "Saving route…"}
                {saveStatus === "success" && "Route logged!"}
                {saveStatus === "idle" && (
                  mountains.length > 0
                    ? `Log ${mountains.length} summit${mountains.length !== 1 ? "s" : ""}`
                    : "Log route"
                )}
              </button>
              <Link to="/mountains" className="tracking-form__delete" style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                Cancel
              </Link>
            </div>
          </form>

        </div>
      </section>
    </main>
  );
}

export default LogRoutePage;
