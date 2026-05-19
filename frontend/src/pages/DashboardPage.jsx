import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getCollections, getMountains, getProgressLogs } from "../lib/api";

function DashboardPage() {
  const [mountains, setMountains] = useState([]);
  const [collections, setCollections] = useState([]);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [mountainData, collectionData, logData] = await Promise.all([
          getMountains(),
          getCollections(),
          getProgressLogs(),
        ]);

        setMountains(
          Array.isArray(mountainData) ? mountainData : mountainData.results || []
        );
        setCollections(Array.isArray(collectionData) ? collectionData : []);
        setLogs(Array.isArray(logData) ? logData : logData.results || []);
        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => {
    const completedLogs = logs.filter((log) => log.status === "completed");
    const plannedLogs = logs.filter((log) => log.status === "planned");

    const completedMountainIds = new Set(
      completedLogs.map((log) => log.mountain)
    );

    const totalDistance = completedLogs.reduce(
      (total, log) => total + Number(log.hike_distance_km || 0),
      0
    );

    const totalHeight = mountains
      .filter((mountain) => completedMountainIds.has(mountain.id))
      .reduce((total, mountain) => total + Number(mountain.height_m || 0), 0);

    const collectionStats = collections.map((collection) => {
      const collectionMountains = mountains.filter(
        (mountain) => mountain.collection?.id === collection.id
      );

      const completedCount = collectionMountains.filter((mountain) =>
        completedMountainIds.has(mountain.id)
      ).length;

      const totalCount =
        collection.expected_total || collectionMountains.length || 0;

      return {
        id: collection.id,
        name: collection.name,
        completed: completedCount,
        total: totalCount,
        percent: totalCount
          ? Math.round((completedCount / totalCount) * 100)
          : 0,
      };
    });

    const statusChartData = [
      {
        name: "Completed",
        value: completedLogs.length,
      },
      {
        name: "Planned",
        value: plannedLogs.length,
      },
      {
        name: "Remaining",
        value: Math.max(
          mountains.length - completedLogs.length - plannedLogs.length,
          0
        ),
      },
    ];

    const collectionChartData = collectionStats.map((collection) => ({
      name: collection.name,
      completed: collection.completed,
      remaining: Math.max(collection.total - collection.completed, 0),
    }));

    return {
      completed: completedLogs.length,
      planned: plannedLogs.length,
      totalVisible: mountains.length,
      totalDistance,
      totalHeight,
      collectionStats,
      statusChartData,
      collectionChartData,
    };
  }, [collections, logs, mountains]);

  return (
    <main className="dashboard-page">
      <section className="section section-dark dashboard-hero">
        <div className="container">
          <p className="section-kicker">Dashboard</p>
          <h1>Your mountain record, mapped by progress.</h1>
          <p>
            Track completed summits, planned objectives, distance logged and
            collection progress across the UK.
          </p>
        </div>
      </section>

      <section className="section section-light">
        <div className="container">
          {status === "loading" && <p>Loading dashboard...</p>}

          {status === "error" && (
            <p>Please log in to view your dashboard progress.</p>
          )}

          {status === "success" && (
            <>
              <div className="dashboard-stat-grid">
                <article className="dashboard-stat-card">
                  <p>Completed</p>
                  <strong>{stats.completed}</strong>
                  <span>summits logged</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Planned</p>
                  <strong>{stats.planned}</strong>
                  <span>future objectives</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Distance</p>
                  <strong>{stats.totalDistance.toFixed(1)}km</strong>
                  <span>personally logged</span>
                </article>

                <article className="dashboard-stat-card">
                  <p>Height total</p>
                  <strong>{Math.round(stats.totalHeight)}m</strong>
                  <span>summit height completed</span>
                </article>
              </div>

              <div className="dashboard-chart-grid">
                <article className="dashboard-chart-card">
                  <div>
                    <p className="section-kicker">Overview</p>
                    <h3>Progress status</h3>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={stats.statusChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={70}
                        outerRadius={105}
                        paddingAngle={4}
                      >
                        {stats.statusChartData.map((entry) => (
                          <Cell
                            key={entry.name}
                            className={`chart-cell chart-cell--${entry.name.toLowerCase()}`}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </article>

                <article className="dashboard-chart-card">
                  <div>
                    <p className="section-kicker">Collections</p>
                    <h3>Completed vs remaining</h3>
                  </div>

                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.collectionChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="completed"
                        stackId="a"
                        className="chart-bar chart-bar--completed"
                      />
                      <Bar
                        dataKey="remaining"
                        stackId="a"
                        className="chart-bar chart-bar--remaining"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </article>
              </div>

              <div className="collection-progress-panel">
                <div>
                  <p className="section-kicker">Collection progress</p>
                  <h2>Progress by mountain list</h2>
                </div>

                <div className="collection-progress-list">
                  {stats.collectionStats.map((collection) => (
                    <Link
                      to={`/collections/${collection.name.toLowerCase().replaceAll(" ", "-")}`}
                      className="collection-progress-card"
                      key={collection.id}
                    >
                      <div>
                        <h3>{collection.name}</h3>
                        <p>
                          {collection.completed} / {collection.total} completed
                        </p>
                      </div>

                      <strong>{collection.percent}%</strong>

                      <div className="progress-track">
                        <span style={{ width: `${collection.percent}%` }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="my-progress-panel">
                <div>
                  <p className="section-kicker">My progress</p>
                  <h2>Saved mountain logs</h2>
                  <p>
                    Review completed and planned mountains, then open each summit
                    to update your route notes, date, distance or status.
                  </p>
                </div>

                <div className="my-progress-list">
                  {logs.length === 0 && (
                    <p>
                      No mountain logs yet. Open a mountain and save your first
                      record.
                    </p>
                  )}

                  {logs.map((log) => (
                    <Link
                      to={`/mountains/${log.mountain_detail?.slug}`}
                      className="my-progress-card"
                      key={log.id}
                    >
                      <div>
                        <p className="my-progress-card__status">
                          {log.status}
                        </p>
                        <h3>{log.mountain_detail?.name}</h3>
                        <p>
                          {log.mountain_detail?.collection?.name} /{" "}
                          {log.mountain_detail?.region?.name}
                        </p>
                      </div>

                      <div className="my-progress-card__meta">
                        <span>{log.completed_date || "No date"}</span>
                        <span>{log.hike_distance_km || "—"}km</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;