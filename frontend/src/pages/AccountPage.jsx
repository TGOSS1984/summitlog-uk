import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getCurrentUser,
  getProgressLogs,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from "../lib/api";
import { TbBook, TbPhoto, TbLayoutDashboard } from "react-icons/tb";

function AccountPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ completed: 0, planned: 0 });
  const [mode, setMode] = useState("login");
  const [authError, setAuthError] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ bio: "" });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [profileSaveStatus, setProfileSaveStatus] = useState("idle");
  const avatarInputRef = useRef(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  async function loadUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      if (data.user) {
        setProfileForm({ bio: data.user.bio || "" });
        loadStats();
      }
    } catch (error) {
      console.error(error);
      setUser(null);
      setStats({ completed: 0, planned: 0 });
    }
  }

  async function loadStats() {
    try {
      const logData = await getProgressLogs();
      const logs = Array.isArray(logData) ? logData : logData.results || [];
      setStats({
        completed: logs.filter((l) => l.status === "completed").length,
        planned: logs.filter((l) => l.status === "planned").length,
      });
    } catch (error) {
      console.warn("Could not load stats:", error);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

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
      await loadUser();
      resetForm();
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
      resetForm();
    } catch (error) {
      console.error(error);
    }
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
      if (selectedAvatar) {
        formData.append("avatar", selectedAvatar);
      }
      const updatedUser = await updateUserProfile(formData);
      setUser(updatedUser);
      setEditingProfile(false);
      setSelectedAvatar(null);
      setAvatarPreview(null);
      setProfileSaveStatus("saved");
      setTimeout(() => setProfileSaveStatus("idle"), 2000);
    } catch (error) {
      console.error(error);
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
                    <img
                      className="account-avatar"
                      src={avatarSrc}
                      alt={`${user.username} avatar`}
                    />
                  ) : (
                    <div className="account-avatar account-avatar--placeholder">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  {editingProfile && (
                    <>
                      <button
                        type="button"
                        className="account-avatar-edit"
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        Change photo
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAvatarChange}
                      />
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
                        onChange={(e) =>
                          setProfileForm((f) => ({ ...f, bio: e.target.value }))
                        }
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
                        onClick={() => {
                          setEditingProfile(false);
                          setAvatarPreview(null);
                          setSelectedAvatar(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    {profileSaveStatus === "error" && (
                      <p className="form-error">Could not save profile.</p>
                    )}
                  </form>
                ) : (
                  <>
                    <p className="section-kicker">Welcome back</p>
                    <h2>{user.username}</h2>
                    <p className="account-email">{user.email}</p>
                    {user.bio && (
                      <p className="account-bio">{user.bio}</p>
                    )}

                    <div className="account-user-stats">
                      <div>
                        <strong>{stats.completed}</strong>
                        <span>Completed</span>
                      </div>
                      <div>
                        <strong>{stats.planned}</strong>
                        <span>Planned</span>
                      </div>
                    </div>

                    {/* Quick links */}
                    <div className="account-quick-links">
                      <Link to="/dashboard" className="account-quick-link">
                        <TbLayoutDashboard size={16} strokeWidth={1.8} />
                        Dashboard
                      </Link>
                      <Link to="/journal" className="account-quick-link">
                        <TbBook size={16} strokeWidth={1.8} />
                        Journal
                      </Link>
                      <Link to="/gallery" className="account-quick-link">
                        <TbPhoto size={16} strokeWidth={1.8} />
                        Gallery
                      </Link>
                    </div>

                    <div className="tracking-form__actions">
                      <button
                        type="button"
                        className="account-submit"
                        onClick={() => setEditingProfile(true)}
                      >
                        Edit profile
                      </button>
                      <button
                        type="button"
                        className="account-logout"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </div>
                    {profileSaveStatus === "saved" && (
                      <p style={{ color: "var(--color-accent)", marginTop: "0.5rem" }}>
                        Profile updated.
                      </p>
                    )}
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
                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      autoComplete="username"
                    />
                  </label>

                  {mode === "register" && (
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        autoComplete="email"
                      />
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

                  {authError && (
                    <p className="form-error">{authError}</p>
                  )}

                  <button className="account-submit" type="submit">
                    {mode === "login" ? "Sign in" : "Create account"}
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default AccountPage;
