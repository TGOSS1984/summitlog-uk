import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  TbMountain, TbRoute, TbSearch, TbX, TbCheck,
  TbArrowUp, TbStar, TbChevronRight, TbPlus, TbEdit, TbTrash,
  TbFlag, TbFileCode,
} from "react-icons/tb";
import {
  createRouteLog, deleteRouteLog, getCurrentUser,
  getRouteLog, searchMountains, updateRouteLog,
} from "../lib/api";
import { ToastContainer, useToast } from "../components/ui/Toast";
import { ConfirmModal } from "../components/ui/ConfirmModal";

// ── GPX parser (shared with MountainDetailPage) ──────────────────────────────

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

function parseGpxFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const doc    = new DOMParser().parseFromString(e.target.result, "text/xml");
        const trkpts = Array.from(doc.querySelectorAll("trkpt"));
        if (trkpts.length < 2) { resolve(null); return; }

        let totalKm = 0;
        for (let i = 1; i < trkpts.length; i++) {
          totalKm += haversineKm(
            parseFloat(trkpts[i - 1].getAttribute("lat")),
            parseFloat(trkpts[i - 1].getAttribute("lon")),
            parseFloat(trkpts[i].getAttribute("lat")),
            parseFloat(trkpts[i].getAttribute("lon")),
          );
        }

        const times = trkpts.map((pt) => pt.querySelector("time")?.textContent).filter(Boolean);
        let durationHours = null;
        if (times.length >= 2) {
          const ms = new Date(times[times.length - 1]) - new Date(times[0]);
          durationHours = ms > 0 ? Math.round((ms / 3600000) * 10) / 10 : null;
        }

        resolve({
          distance_km:    Math.round(totalKm * 100) / 100,
          duration_hours: durationHours,
          steps:          Math.round(totalKm * 1300),
        });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ── Mountain search ──────────────────────────────────────────────────────────

function MountainSearch({ onAdd, selectedIds }) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
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
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 280);
    return () => clearTimeout(timerRef.current);
  }, [query, selectedIds]);

  function handleAdd(mountain) { onAdd(mountain); setQuery(""); setResults([]); }

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
              <button type="button" className="route-search__result" onClick={() => handleAdd(m)}>
                <span className="route-search__result-name">{m.name}</span>
                <span className="route-search__result-meta">{m.height_m}m · {m.region?.name}</span>
                <TbPlus size={14} strokeWidth={2.5} className="route-search__result-add" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Mountain list ────────────────────────────────────────────────────────────

function SelectedMountainList({ mountains, primaryId, onSetPrimary, onRemove, readOnly = false }) {
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
          <li key={m.id} className={`route-mountain-item${isPrimary ? " route-mountain-item--primary" : ""}`}>
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
            {!readOnly && (
              <div className="route-mountain-item__actions">
                {!isPrimary && (
                  <button type="button" className="route-mountain-item__primary-btn" onClick={() => onSetPrimary(m.id)}>
                    <TbArrowUp size={13} strokeWidth={2} /> Set primary
                  </button>
                )}
                {isPrimary && <span className="route-mountain-item__primary-label">Primary</span>}
                <button type="button" className="route-mountain-item__remove" onClick={() => onRemove(m.id)} title="Remove">
                  <TbX size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
            {readOnly && isPrimary && <span className="route-mountain-item__primary-label">Primary</span>}
          </li>
        );
      })}
    </ul>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const emptyForm = {
  name: "", description: "", status: "completed", completed_date: "", season: "",
  route_taken: "", hike_distance_km: "", hike_duration_hours: "",
  steps: "", flights_climbed: "", notes: "",
};

function LogRoutePage() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEditMode = Boolean(id);

  const { toasts, addToast, removeToast } = useToast();

  const [isLoggedIn,    setIsLoggedIn]    = useState(null);
  const [loading,       setLoading]       = useState(isEditMode);
  const [form,          setForm]          = useState(emptyForm);
  const [mountains,     setMountains]     = useState([]);
  const [primaryId,     setPrimaryId]     = useState(null);
  const [saveStatus,    setSaveStatus]    = useState("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [gpxHint,       setGpxHint]       = useState(null);

  useEffect(() => {
    getCurrentUser()
      .then((data) => setIsLoggedIn(!!data?.user))
      .catch(() => setIsLoggedIn(false));
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    async function loadRoute() {
      try {
        const data = await getRouteLog(id);
        setForm({
          name:                data.name               || "",
          description:         data.description        || "",
          status:              data.status             || "completed",
          completed_date:      data.completed_date     || "",
          season:              data.season             || "",
          route_taken:         data.route_taken        || "",
          hike_distance_km:    data.hike_distance_km   ?? "",
          hike_duration_hours: data.hike_duration_hours ?? "",
          steps:               data.steps              ?? "",
          flights_climbed:     data.flights_climbed    ?? "",
          notes:               data.notes              || "",
        });
        setMountains(data.mountains || []);
        setPrimaryId(data.primary_mountain_id || null);
      } catch {
        addToast("Unable to load route. It may have been deleted.", "error");
        navigate("/journal", { replace: true });
      } finally { setLoading(false); }
    }
    loadRoute();
  }, [id, isEditMode]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  // ── GPX auto-fill for cumulative stats ─────────────────────────────────────

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
    } catch { setGpxHint("Could not parse GPX file."); }
  }

  function handleAddMountain(mountain) {
    setMountains((prev) => {
      const updated = [...prev, mountain];
      const highest = updated.reduce((h, m) => (Number(m.height_m) > Number(h.height_m || 0) ? m : h), updated[0]);
      setPrimaryId(highest.id);
      return updated;
    });
  }

  function handleRemoveMountain(mountId) {
    setMountains((prev) => {
      const updated = prev.filter((m) => m.id !== mountId);
      if (primaryId === mountId && updated.length > 0) {
        const highest = updated.reduce((h, m) => (Number(m.height_m) > Number(h.height_m || 0) ? m : h), updated[0]);
        setPrimaryId(highest.id);
      } else if (updated.length === 0) { setPrimaryId(null); }
      return updated;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { addToast("Give your route a name.", "error"); return; }
    if (form.status === "completed" && !form.completed_date) {
      addToast("Add the date you completed this route.", "error"); return;
    }

    if (isEditMode) {
      try {
        setSaveStatus("saving");
        await updateRouteLog(id, {
          name:                form.name.trim(),
          description:         form.description.trim(),
          status:              form.status,
          completed_date:      form.completed_date || null,
          season:              form.season || "",
          route_taken:         form.route_taken.trim(),
          hike_distance_km:    form.hike_distance_km    ? Number(form.hike_distance_km)    : null,
          hike_duration_hours: form.hike_duration_hours ? Number(form.hike_duration_hours) : null,
          steps:               form.steps               ? Number(form.steps)               : null,
          flights_climbed:     form.flights_climbed     ? Number(form.flights_climbed)     : null,
          notes:               form.notes.trim(),
        });
        setSaveStatus("success");
        addToast("Route updated successfully.", "success");
        setTimeout(() => navigate("/journal"), 1600);
      } catch (err) {
        setSaveStatus("idle");
        addToast(err.message || "Unable to update route.", "error");
      }
    } else {
      if (mountains.length < 2) { addToast("Add at least 2 mountains to log a route.", "error"); return; }
      try {
        setSaveStatus("saving");
        const payload = {
          name:                form.name.trim(),
          description:         form.description.trim(),
          status:              form.status,
          completed_date:      form.completed_date || null,
          season:              form.season || "",
          mountain_ids:        mountains.map((m) => m.id),
          primary_mountain_id: primaryId,
          route_taken:         form.route_taken.trim(),
          hike_distance_km:    form.hike_distance_km    ? Number(form.hike_distance_km)    : null,
          hike_duration_hours: form.hike_duration_hours ? Number(form.hike_duration_hours) : null,
          steps:               form.steps               ? Number(form.steps)               : null,
          flights_climbed:     form.flights_climbed     ? Number(form.flights_climbed)     : null,
          notes:               form.notes.trim(),
        };
        const result = await createRouteLog(payload);
        setSaveStatus("success");
        const verb = form.status === "planned" ? "Route planned" : "Route logged";
        addToast(result.message || `${verb} — ${result.mountains_count} summits added.`, "success");
        setTimeout(() => navigate("/journal"), 1800);
      } catch (err) {
        setSaveStatus("idle");
        addToast(err.message || "Unable to save route. Try again.", "error");
      }
    }
  }

  async function handleDeleteConfirmed() {
    setConfirmDelete(false);
    try {
      const result = await deleteRouteLog(id);
      addToast(result.detail || "Route deleted.", "info");
      setTimeout(() => navigate("/journal"), 1200);
    } catch (err) { addToast(err.message || "Unable to delete route.", "error"); }
  }

  const isPlanned     = form.status === "planned";
  const dateLabelText = isPlanned ? "Target date" : "Date completed";
  const dateRequired  = !isPlanned;

  if (isLoggedIn === null || loading) {
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
              <p>Create a free account to log multi-mountain routes.</p>
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

  const selectedIds     = new Set(mountains.map((m) => m.id));
  const primaryMountain = mountains.find((m) => m.id === primaryId);

  return (
    <main className="log-route-page">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {confirmDelete && (
        <ConfirmModal
          title="Delete route"
          message={`Delete "${form.name}" and all ${mountains.length} linked summit logs? This cannot be undone.`}
          confirmLabel="Delete route"
          cancelLabel="Keep it"
          danger
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Hero */}
      <section className="section section-dark log-route-hero">
        <div className="container">
          <p className="section-kicker">
            <span className="kicker-line" />
            {isEditMode ? "Edit route" : "Log a route"}
          </p>
          <h1 className="page-hero__h1">
            <span className="page-hero__h1-top">{isEditMode ? "Edit your" : "Multi-mountain"}</span>
            <span className="page-hero__h1-bottom">
              {isEditMode ? `${form.name || "Route"}.` : "Route log."}
            </span>
          </h1>
          {!isEditMode && (
            <p>
              Log a completed route or plan an upcoming one — the Fairfield Horseshoe,
              a Munro round, a ridge walk. Each summit is added individually and your
              cumulative stats stored on the highest peak.
            </p>
          )}
          {isEditMode && (
            <p>Update the route name, status, date and cumulative stats. The mountain list cannot be changed after logging.</p>
          )}
        </div>
      </section>

      {/* How it works */}
      {!isEditMode && (
        <div className="route-explainer-strip">
          <div className="container">
            <div className="route-explainer">
              {[
                { n: 1, title: "Name your route",  desc: "Give the walk a name. Planned or completed." },
                { n: 2, title: "Add mountains",    desc: "Search and add every summit you'll cross." },
                { n: 3, title: "Set primary",      desc: "Highest peak carries your total stats." },
                { n: 4, title: "Save it",          desc: "All summits logged or planned at once." },
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
      )}

      {/* Form */}
      <section className="section section-dark">
        <div className="container tracking-panel">

          {/* LEFT */}
          <div>
            <p className="section-kicker">
              <span className="kicker-line" />
              {isEditMode ? "Edit route" : "Route details"}
            </p>
            <h2>{isEditMode ? "Update details" : "About this route"}</h2>
            <p style={{ color: "rgba(248,250,252,0.72)", marginTop: "var(--space-md)", maxWidth: 520 }}>
              {isEditMode
                ? "You can update the name, status, date and all cumulative stats. The mountain list is fixed."
                : "Fill in the route name and status, then build your summit list on the right. Cumulative stats are stored on the primary summit only."}
            </p>

            {primaryMountain && (
              <div className="ascent-history" style={{ marginTop: "var(--space-xl)" }}>
                <p className="ascent-history__label">
                  {isEditMode ? "Primary summit" : "Primary summit — stats stored here"}
                </p>
                <div className="route-primary-summit-chip">
                  <TbStar size={13} strokeWidth={2.5} />
                  <strong>{primaryMountain.name}</strong>
                  <span>{primaryMountain.height_m}m</span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "rgba(248,250,252,0.45)", marginTop: "0.5rem" }}>
                  {mountains.length} summit{mountains.length !== 1 ? "s" : ""} on this route.
                </p>
              </div>
            )}

            {isPlanned && !isEditMode && (
              <div className="route-planned-hint">
                <TbFlag size={14} strokeWidth={2} />
                <p>
                  Saving as <strong>Planned</strong> — all summits will be marked as planned.
                  Date is optional (use it as a target date). You can log stats later once completed.
                </p>
              </div>
            )}

            {isEditMode && (
              <button
                type="button"
                className="route-delete-btn"
                onClick={() => setConfirmDelete(true)}
                style={{ marginTop: "var(--space-xl)" }}
              >
                <TbTrash size={15} strokeWidth={2} />
                Delete this route
              </button>
            )}
          </div>

          {/* RIGHT */}
          <form className="tracking-form glass-card route-tracking-form" onSubmit={handleSubmit}>

            <label>
              Route name
              {!form.name && <span className="field-hint field-hint--required">Required</span>}
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Fairfield Horseshoe" />
            </label>

            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Optional notes about this route…" />
            </label>

            {/* Status toggle */}
            <div>
              <span style={{ display: "block", fontWeight: 700, color: "rgba(248,250,252,0.8)", marginBottom: "0.5rem" }}>Status</span>
              <div className="route-status-toggle">
                <button
                  type="button"
                  className={`route-status-toggle__btn${form.status === "completed" ? " route-status-toggle__btn--active" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, status: "completed" }))}
                >
                  <TbCheck size={14} strokeWidth={2.5} /> Completed
                </button>
                <button
                  type="button"
                  className={`route-status-toggle__btn route-status-toggle__btn--planned${form.status === "planned" ? " route-status-toggle__btn--active route-status-toggle__btn--active-planned" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, status: "planned" }))}
                >
                  <TbFlag size={14} strokeWidth={2} /> Planned
                </button>
              </div>
            </div>

            <div className="tracking-form__row">
              <label>
                {dateLabelText}
                {dateRequired && !form.completed_date && (
                  <span className="field-hint field-hint--required">Required</span>
                )}
                {!dateRequired && <span className="field-hint">Optional — use as target date</span>}
                <input type="date" name="completed_date" value={form.completed_date} onChange={handleChange} />
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
              <input type="text" name="route_taken" value={form.route_taken} onChange={handleChange} placeholder="e.g. Rydal → Fairfield → Dove Crag → Ambleside" />
            </label>

            {/* Mountain builder */}
            {!isEditMode && (
              <div className="route-inline-builder">
                <p className="route-inline-builder__label">
                  Mountains on this route
                  {mountains.length > 0 && <span className="route-inline-builder__count">{mountains.length} added</span>}
                </p>
                {mountains.length < 2 && (
                  <p className="route-inline-builder__hint">
                    Add at least 2 summits. To log a single mountain, open it from the{" "}
                    <Link to="/mountains">Mountains page</Link> and use the tracking form there.
                  </p>
                )}
                <MountainSearch onAdd={handleAddMountain} selectedIds={selectedIds} />
                <SelectedMountainList mountains={mountains} primaryId={primaryId} onSetPrimary={setPrimaryId} onRemove={handleRemoveMountain} readOnly={false} />
              </div>
            )}

            {isEditMode && mountains.length > 0 && (
              <div className="route-inline-builder">
                <p className="route-inline-builder__label">
                  Mountains on this route
                  <span className="route-inline-builder__count">{mountains.length} summits</span>
                </p>
                <p className="route-inline-builder__hint" style={{ borderLeftColor: "rgba(255,255,255,0.15)" }}>
                  The mountain list cannot be changed after logging. Delete and re-log if needed.
                </p>
                <SelectedMountainList mountains={mountains} primaryId={primaryId} onSetPrimary={() => {}} onRemove={() => {}} readOnly={true} />
              </div>
            )}

            {/* Cumulative stats */}
            <p className="route-stats-heading">
              <span className="kicker-line" />
              {isPlanned ? "Estimated stats" : "Cumulative stats"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(248,250,252,0.5)", marginTop: "-0.5rem" }}>
              {isPlanned
                ? "Optional — fill in estimates if you have them, or add later once completed."
                : "Totals for the whole route — stored on the primary summit only."}
            </p>

            {/* GPX upload — auto-fills cumulative stats */}
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
              <label>Distance km<input type="number" step="0.1" name="hike_distance_km" value={form.hike_distance_km} onChange={handleChange} placeholder="e.g. 15.2" /></label>
              <label>Duration hours<input type="number" step="0.1" name="hike_duration_hours" value={form.hike_duration_hours} onChange={handleChange} placeholder="e.g. 7.5" /></label>
            </div>
            <div className="tracking-form__row">
              <label>Steps<input type="number" name="steps" value={form.steps} onChange={handleChange} placeholder="e.g. 28000" /></label>
              <label>Flights climbed<input type="number" name="flights_climbed" value={form.flights_climbed} onChange={handleChange} placeholder="e.g. 86" /></label>
            </div>

            <label>
              Notes
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="Weather, conditions, who you walked with…" />
            </label>

            <div className="tracking-form__actions">
              <button
                type="submit"
                disabled={saveStatus === "saving" || saveStatus === "success" || (!isEditMode && mountains.length < 2)}
                title={!isEditMode && mountains.length < 2 ? "Add at least 2 mountains" : undefined}
              >
                {saveStatus === "saving"  && (isEditMode ? "Saving…" : isPlanned ? "Planning route…" : "Logging route…")}
                {saveStatus === "success" && (isEditMode ? "Saved!" : isPlanned ? "Route planned!" : "Route logged!")}
                {saveStatus === "idle"    && (
                  isEditMode ? (
                    <><TbEdit size={15} strokeWidth={2} /> Save changes</>
                  ) : isPlanned ? (
                    mountains.length > 0
                      ? <><TbFlag size={15} strokeWidth={2} /> Plan {mountains.length} summit{mountains.length !== 1 ? "s" : ""}</>
                      : <><TbFlag size={15} strokeWidth={2} /> Plan route</>
                  ) : (
                    mountains.length > 0 ? `Log ${mountains.length} summit${mountains.length !== 1 ? "s" : ""}` : "Log route"
                  )
                )}
              </button>
              <Link
                to={isEditMode ? "/journal" : "/mountains"}
                className="tracking-form__delete"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
              >
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
