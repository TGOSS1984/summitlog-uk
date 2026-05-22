import { useEffect, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  getProgressLogs,
} from "../lib/api";

function AccountPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ completed: 0, planned: 0 });
  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  async function loadUser() {
    try {
      const data = await getCurrentUser();
      setUser(data.user);
      // Load logs once we know there's a logged-in user
      loadStats();
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
    setForm((current) => ({ ...current, [name]: value }));
  }

  function resetForm() {
    setForm({ username: "", email: "", password: "" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      if (mode === "login") {
        await loginUser({ username: form.username, password: form.password });
      } else {
        await registerUser(form);
      }
      await loadUser();
      resetForm();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();
      setUser(null);
      setStats({ completed: 0, planned: 0 });
      resetForm();
    } catch (error) {
      console.error(error);
    }
  }

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
                <p className="section-kicker">Welcome back</p>
                <h2>{user.username}</h2>
                <p className="account-email">{user.email}</p>

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

                <button
                  type="button"
                  className="account-logout"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <div className="account-tabs">
                  <button
                    type="button"
                    className={mode === "login" ? "account-tab active" : "account-tab"}
                    onClick={() => setMode("login")}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    className={mode === "register" ? "account-tab active" : "account-tab"}
                    onClick={() => setMode("register")}
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
