import { useEffect, useState } from "react";

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../lib/api";

function AccountPage() {
  const [user, setUser] = useState(null);

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
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      if (mode === "login") {
        await loginUser({
          username: form.username,
          password: form.password,
        });
      } else {
        await registerUser(form);
      }

      loadUser();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleLogout() {
    try {
      await logoutUser();

      setUser(null);

      setForm({
        username: "",
        email: "",
        password: "",
      });
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <main>

      <section className="section section-dark">

        <div className="container account-grid">

          <div>

            <p className="section-kicker">
              Account
            </p>

            <h1>
              Your SummitLog profile
            </h1>

            <p>
              Create an account and track your
              mountain progress across regions,
              collections and future goals.
            </p>

          </div>

          <div className="glass-card account-panel">

            {user ? (
              <>
                <h2>
                  Welcome back
                </h2>

                <p>
                  {user.username}
                </p>

                <p>
                  {user.email}
                </p>

                <button
                  onClick={handleLogout}
                >
                  Logout
                </button>

              </>
            ) : (
              <>

                <div className="account-switch">

                  <button
                    onClick={() => setMode("login")}
                  >
                    Login
                  </button>

                  <button
                    onClick={() => setMode("register")}
                  >
                    Register
                  </button>

                </div>

                <form
                  className="tracking-form"
                  onSubmit={handleSubmit}
                >

                  <label>

                    Username

                    <input
                      name="username"
                      value={form.username}
                      onChange={handleChange}
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
                      />

                    </label>
                  )}

                  <label>

                    Password

                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                    />

                  </label>

                  <button type="submit">

                    {mode === "login"
                      ? "Login"
                      : "Register"}

                  </button>

                </form>

              </>
            )}

          </div>

        </div>

      </section>

    </main>
  );
}

export default AccountPage;