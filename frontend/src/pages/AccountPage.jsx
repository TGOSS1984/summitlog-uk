import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCurrentUser,
  getProgressLogs,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  getCsrfToken,
  getNotificationPreferences,
  updateNotificationPreferences,
  getShareSettings,
  updateShareSettings,
} from "../lib/api";
import {
  TbBook, TbPhoto, TbLayoutDashboard,
  TbUpload, TbCheck, TbX, TbAlertTriangle, TbFileSpreadsheet, TbBell, TbShare2,
} from "react-icons/tb";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// ── CSV Import panel ─────────────────────────────────────────────────────────

function CsvImportPanel() {
  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null); // first 5 rows + headers
  const [importState, setImportState] = useState("idle"); // idle | previewing | importing | done | error
  const [result,      setResult]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState(null);
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setErrorMsg(null);

    // Read and preview the CSV client-side
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text  = ev.target.result;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setPreview(null); return; }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const rows    = lines.slice(1, 6).map((line) =>
        line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
      );
      setPreview({ headers, rows, total: lines.length - 1 });
      setImportState("previewing");
    };
    reader.readAsText(f, "utf-8");
  }

  async function handleImport() {
    if (!file) return;
    setImportState("importing");
    setErrorMsg(null);
    try {
      const csrfToken = await getCsrfToken();
      const formData  = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/progress/import/`, {
        method:      "POST",
        credentials: "include",
        headers:     { "X-CSRFToken": csrfToken },
        body:        formData,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.detail || "Import failed.");
      }
      setResult(data);
      setImportState("done");
      setFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setErrorMsg(err.message || "Import failed. Please try again.");
      setImportState("error");
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setErrorMsg(null);
    setImportState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="csv-import-panel">
      <div className="csv-import-panel__header">
        <TbFileSpreadsheet size={20} strokeWidth={1.8} style={{ color: "var(--color-accent)" }} />
        <div>
          <h3>Import from CSV</h3>
          <p>
            Migrate your existing mountain log from a spreadsheet. Needs at least a
            "Mountain" and "Date" column. Status, season, notes, distance and duration
            are picked up automatically if present.
          </p>
        </div>
      </div>

      {/* File picker */}
      {importState === "idle" || importState === "previewing" ? (
        <label className="csv-import-panel__file-label">
          <TbUpload size={16} strokeWidth={2} />
          {file ? file.name : "Choose CSV file"}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
        </label>
      ) : null}

      {/* Preview table */}
      {importState === "previewing" && preview && (
        <div className="csv-import-panel__preview">
          <p className="csv-import-panel__preview-label">
            Preview — first {Math.min(preview.rows.length, 5)} of {preview.total} rows
          </p>
          <div className="csv-import-panel__table-wrap">
            <table className="csv-import-panel__table">
              <thead>
                <tr>{preview.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row, ri) => (
                  <tr key={ri}>{preview.headers.map((_, ci) => <td key={ci}>{row[ci] || ""}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="csv-import-panel__actions">
            <button type="button" className="csv-import-panel__import-btn" onClick={handleImport}>
              <TbUpload size={14} strokeWidth={2} />
              Import {preview.total} rows
            </button>
            <button type="button" className="csv-import-panel__cancel-btn" onClick={handleReset}>
              <TbX size={14} strokeWidth={2.5} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Importing spinner */}
      {importState === "importing" && (
        <p className="csv-import-panel__status">Importing… please wait.</p>
      )}

      {/* Result */}
      {importState === "done" && result && (
        <div className="csv-import-panel__result csv-import-panel__result--success">
          <TbCheck size={18} strokeWidth={2.5} />
          <div>
            <strong>{result.imported} mountain{result.imported !== 1 ? "s" : ""} imported successfully</strong>
            {result.skipped?.length > 0 && (
              <details className="csv-import-panel__skipped">
                <summary>{result.skipped.length} row{result.skipped.length !== 1 ? "s" : ""} skipped</summary>
                <ul>
                  {result.skipped.map((s, i) => (
                    <li key={i}>Row {s.row}{s.name ? ` — ${s.name}` : ""}: {s.reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <button type="button" className="csv-import-panel__cancel-btn" onClick={handleReset}>
            Import another
          </button>
        </div>
      )}

      {/* Error */}
      {importState === "error" && (
        <div className="csv-import-panel__result csv-import-panel__result--error">
          <TbAlertTriangle size={18} strokeWidth={2} />
          <span>{errorMsg}</span>
          <button type="button" className="csv-import-panel__cancel-btn" onClick={handleReset}>
            Try again
          </button>
        </div>
      )}

      {/* Format hint */}
      <details className="csv-import-panel__hint">
        <summary>Expected CSV format</summary>
        <div className="csv-import-panel__hint-body">
          <p>Required columns (flexible naming):</p>
          <code>Mountain, Date</code>
          <p>Optional columns:</p>
          <code>Status, Season, Notes, Distance (km), Duration (hrs), Steps</code>
          <p>Supported date formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD Mon YYYY</p>
          <p>Status values: completed, planned, not started</p>
        </div>
      </details>
    </div>
  );
}

// ── Notification preferences panel ──────────────────────────────────────────

function NotificationsPanel({ userEmail }) {
  const [prefs,   setPrefs]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const saveMsgTimer = useRef(null);

  useEffect(() => {
    getNotificationPreferences()
      .then((data) => setPrefs(data))
      .catch(() => {}); // non-fatal — panel stays hidden if endpoint unavailable
  }, []);

  function showSaved() {
    setSaveMsg("Saved");
    clearTimeout(saveMsgTimer.current);
    saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 2000);
  }

  async function handleToggle() {
    if (!prefs || saving) return;
    setSaving(true);
    try {
      const result = await updateNotificationPreferences({
        email_reminders_enabled: !prefs.email_reminders_enabled,
      });
      setPrefs(result);
      showSaved();
    } catch { /* non-fatal */ } finally { setSaving(false); }
  }

  async function handleDaysChange(e) {
    if (!prefs || saving) return;
    setSaving(true);
    try {
      const result = await updateNotificationPreferences({
        reminder_days_before: Number(e.target.value),
      });
      setPrefs(result);
      showSaved();
    } catch { /* non-fatal */ } finally { setSaving(false); }
  }

  if (!prefs) return null;

  return (
    <div className="account-notifications">
      <div className="account-notifications__header">
        <TbBell size={15} strokeWidth={2} />
        <strong>Email reminders</strong>
        {saveMsg && <span className="account-notifications__save-msg">{saveMsg}</span>}
      </div>
      <p className="account-notifications__desc">
        {prefs.email_reminders_enabled
          ? `Reminders will be sent to ${userEmail}.`
          : "Get an email before your planned summits are due."}
      </p>
      <div className="account-notifications__controls">
        <button
          type="button"
          className={`account-notifications__toggle${prefs.email_reminders_enabled ? " account-notifications__toggle--on" : ""}`}
          onClick={handleToggle}
          disabled={saving}
          aria-label={prefs.email_reminders_enabled ? "Disable email reminders" : "Enable email reminders"}
        >
          <span className="account-notifications__toggle-knob" />
          {prefs.email_reminders_enabled ? "On" : "Off"}
        </button>
        {prefs.email_reminders_enabled && (
          <select
            value={prefs.reminder_days_before}
            onChange={handleDaysChange}
            disabled={saving}
            className="account-notifications__days"
          >
            <option value={1}>1 day before</option>
            <option value={2}>2 days before</option>
            <option value={3}>3 days before</option>
            <option value={7}>1 week before</option>
          </select>
        )}
      </div>
    </div>
  );
}

// ── Public sharing panel ─────────────────────────────────────────────────────

function SharingPanel() {
  const [settings,  setSettings]  = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const saveMsgTimer = useRef(null);

  useEffect(() => {
    getShareSettings()
      .then((data) => setSettings(data))
      .catch(() => {}); // non-fatal — panel stays hidden if endpoint unavailable
  }, []);

  function showSaved() {
    setSaveMsg("Saved");
    clearTimeout(saveMsgTimer.current);
    saveMsgTimer.current = setTimeout(() => setSaveMsg(null), 2000);
  }

  async function handleToggle() {
    if (!settings || saving) return;
    setSaving(true);
    try {
      const result = await updateShareSettings({ sharing_enabled: !settings.sharing_enabled });
      setSettings(result);
      showSaved();
    } catch { /* non-fatal */ } finally { setSaving(false); }
  }

  async function handleRegenerate() {
    if (!settings || saving) return;
    const confirmed = window.confirm(
      "This replaces your share link with a new one — anyone with the old link will no longer be able to view it. Continue?"
    );
    if (!confirmed) return;
    setSaving(true);
    try {
      const result = await updateShareSettings({ regenerate: true });
      setSettings(result);
      showSaved();
    } catch { /* non-fatal */ } finally { setSaving(false); }
  }

  function handleCopy(url, key) {
    navigator.clipboard?.writeText(url).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    });
  }

  if (!settings) return null;

  const links = [
    { key: "dashboard", label: "Dashboard",     path: "/share/dashboard" },
    { key: "progress",  label: "Progress list", path: "/share/progress" },
  ];

  return (
    <div className="account-notifications">
      <div className="account-notifications__header">
        <TbShare2 size={15} strokeWidth={2} />
        <strong>Public sharing</strong>
        {saveMsg && <span className="account-notifications__save-msg">{saveMsg}</span>}
      </div>
      <p className="account-notifications__desc">
        {settings.sharing_enabled
          ? "Anyone with these links can view your dashboard and progress, read-only."
          : "Turn on to get read-only links to your dashboard and progress list that anyone can view, no account needed."}
      </p>
      <div className="account-notifications__controls">
        <button
          type="button"
          className={`account-notifications__toggle${settings.sharing_enabled ? " account-notifications__toggle--on" : ""}`}
          onClick={handleToggle}
          disabled={saving}
          aria-label={settings.sharing_enabled ? "Turn off public sharing" : "Turn on public sharing"}
        >
          <span className="account-notifications__toggle-knob" />
          {settings.sharing_enabled ? "On" : "Off"}
        </button>
      </div>

      {settings.sharing_enabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.75rem" }}>
          {links.map(({ key, label, path }) => {
            const url = `${window.location.origin}${path}/${settings.share_token}`;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, minWidth: 80 }}>{label}</span>
                <code
                  style={{
                    fontSize: "0.7rem", background: "rgba(4,57,59,0.06)", padding: "0.3rem 0.5rem",
                    borderRadius: 6, flex: "1 1 140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {url}
                </code>
                <button
                  type="button"
                  className={`share-card__copy${copiedKey === key ? " share-card__copy--copied" : ""}`}
                  onClick={() => handleCopy(url, key)}
                >
                  <TbShare2 size={14} strokeWidth={2} />
                  {copiedKey === key ? "Copied!" : "Copy link"}
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={saving}
            style={{
              fontSize: "0.72rem", background: "none", border: "none", color: "var(--color-text-soft)",
              textDecoration: "underline", cursor: "pointer", padding: 0, alignSelf: "flex-start", marginTop: "0.25rem",
            }}
          >
            Regenerate link (invalidates the old one)
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AccountPage() {
  const [user,              setUser]              = useState(null);
  const [stats,             setStats]             = useState({ completed: 0, planned: 0 });
  const [mode,              setMode]              = useState("login");
  const [authError,         setAuthError]         = useState(null);
  const [editingProfile,    setEditingProfile]    = useState(false);
  const [profileForm,       setProfileForm]       = useState({ bio: "" });
  const [avatarPreview,     setAvatarPreview]     = useState(null);
  const [selectedAvatar,    setSelectedAvatar]    = useState(null);
  const [profileSaveStatus, setProfileSaveStatus] = useState("idle");
  const [showImport,        setShowImport]        = useState(false);
  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({ username: "", email: "", password: "" });

  async function loadUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      if (data.user) {
        setProfileForm({ bio: data.user.bio || "" });
        loadStats();
      }
      return data.user || null;
    } catch {
      setUser(null);
      setStats({ completed: 0, planned: 0 });
      return null;
    }
  }

  async function loadStats() {
    try {
      const logData = await getProgressLogs();
      const logs    = Array.isArray(logData) ? logData : logData.results || [];
      setStats({
        completed: logs.filter((l) => l.status === "completed").length,
        planned:   logs.filter((l) => l.status === "planned").length,
      });
    } catch { /* non-fatal */ }
  }

  useEffect(() => { loadUser(); }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setAuthError(null);
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm({ username: "", email: "", password: "" });
    setAuthError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAuthError(null);
    try {
      if (mode === "login") {
        await loginUser({ username: form.username, password: form.password });
      } else {
        await registerUser(form);
      }
      const loggedInUser = await loadUser();
      if (loggedInUser) {
        resetForm();
      } else {
        setAuthError("Signed in but could not establish a session — your browser may be blocking cross-site cookies. Try a different browser, or disable Safari's 'Prevent Cross-Site Tracking' setting.");
      }
    } catch (error) {
      setAuthError(error.message || "Something went wrong. Please try again.");
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
      setUser(null);
      setStats({ completed: 0, planned: 0 });
      setEditingProfile(false);
      setShowImport(false);
      resetForm();
    } catch { /* ignore */ }
  }

  function handleAvatarChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    setSelectedAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    try {
      setProfileSaveStatus("saving");
      const formData = new FormData();
      formData.append("bio", profileForm.bio);
      if (selectedAvatar) formData.append("avatar", selectedAvatar);
      const updatedUser = await updateUserProfile(formData);
      setUser(updatedUser);
      setEditingProfile(false);
      setSelectedAvatar(null);
      setAvatarPreview(null);
      setProfileSaveStatus("saved");
      setTimeout(() => setProfileSaveStatus("idle"), 2000);
    } catch {
      setProfileSaveStatus("error");
    }
  }

  const avatarSrc = avatarPreview || user?.avatar || null;

  return (
    <main className="account-page">
      <section className="section section-dark dashboard-hero">
        <div className="container account-layout">
          <div className="account-content">
            <p className="section-kicker">Account</p>
            <h1>Your SummitLog profile</h1>
            <p>
              Create an account and track mountain progress across regions,
              collections and future goals.
            </p>
          </div>

          <aside className="glass-card account-panel">
            {user ? (
              <>
                <div className="account-avatar-wrap">
                  {avatarSrc ? (
                    <img className="account-avatar" src={avatarSrc} alt={`${user.username} avatar`} />
                  ) : (
                    <div className="account-avatar account-avatar--placeholder">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  {editingProfile && (
                    <>
                      <button type="button" className="account-avatar-edit" onClick={() => avatarInputRef.current?.click()}>
                        Change photo
                      </button>
                      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                    </>
                  )}
                </div>

                {editingProfile ? (
                  <form onSubmit={handleProfileSave} className="account-form">
                    <label>
                      Bio
                      <textarea
                        rows={3}
                        value={profileForm.bio}
                        onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                        placeholder="Tell us about your hiking..."
                      />
                    </label>
                    <div className="tracking-form__actions">
                      <button type="submit" className="account-submit">
                        {profileSaveStatus === "saving" ? "Saving..." : "Save profile"}
                      </button>
                      <button
                        type="button"
                        className="tracking-form__delete"
                        onClick={() => { setEditingProfile(false); setAvatarPreview(null); setSelectedAvatar(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                    {profileSaveStatus === "error" && <p className="form-error">Could not save profile.</p>}
                  </form>
                ) : (
                  <>
                    <p className="section-kicker">Welcome back</p>
                    <h2>{user.username}</h2>
                    <p className="account-email">{user.email}</p>
                    {user.bio && <p className="account-bio">{user.bio}</p>}

                    <div className="account-user-stats">
                      <div><strong>{stats.completed}</strong><span>Completed</span></div>
                      <div><strong>{stats.planned}</strong><span>Planned</span></div>
                    </div>

                    <div className="account-quick-links">
                      <Link to="/dashboard" className="account-quick-link">
                        <TbLayoutDashboard size={16} strokeWidth={1.8} />Dashboard
                      </Link>
                      <Link to="/journal" className="account-quick-link">
                        <TbBook size={16} strokeWidth={1.8} />Journal
                      </Link>
                      <Link to="/gallery" className="account-quick-link">
                        <TbPhoto size={16} strokeWidth={1.8} />Gallery
                      </Link>
                    </div>

                    <div className="tracking-form__actions">
                      <button type="button" className="account-submit" onClick={() => setEditingProfile(true)}>
                        Edit profile
                      </button>
                      <button type="button" className="account-logout" onClick={handleLogout}>
                        Logout
                      </button>
                    </div>

                    {profileSaveStatus === "saved" && (
                      <p style={{ color: "var(--color-accent)", marginTop: "0.5rem" }}>Profile updated.</p>
                    )}

                    {/* Email reminder notifications */}
                    <NotificationsPanel userEmail={user.email} />

                    {/* Public sharing toggle */}
                    <SharingPanel />

                    {/* Import toggle */}
                    <button
                      type="button"
                      className="account-import-toggle"
                      onClick={() => setShowImport((v) => !v)}
                    >
                      <TbFileSpreadsheet size={15} strokeWidth={2} />
                      {showImport ? "Hide import" : "Import from CSV"}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="account-tabs">
                  <button
                    type="button"
                    className={mode === "login" ? "account-tab active" : "account-tab"}
                    onClick={() => { setMode("login"); setAuthError(null); }}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={mode === "register" ? "account-tab active" : "account-tab"}
                    onClick={() => { setMode("register"); setAuthError(null); }}
                  >
                    Register
                  </button>
                </div>

                <form className="account-form" onSubmit={handleSubmit}>
                  <label>
                    Username
                    <input name="username" value={form.username} onChange={handleChange} autoComplete="username" />
                  </label>
                  {mode === "register" && (
                    <label>
                      Email
                      <input name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
                    </label>
                  )}
                  <label>
                    Password
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                  </label>
                  {authError && <p className="form-error">{authError}</p>}
                  <button className="account-submit" type="submit">
                    {mode === "login" ? "Sign in" : "Create account"}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      </section>

      {/* CSV import panel — outside the glass card so it has full width */}
      {user && showImport && (
        <section className="section section-light" style={{ paddingTop: "var(--space-xl)" }}>
          <div className="container">
            <CsvImportPanel />
          </div>
        </section>
      )}
    </main>
  );
}

export default AccountPage;