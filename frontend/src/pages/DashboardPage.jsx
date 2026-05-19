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

const DASHBOARD_COLLECTIONS = [
  { name: "Wainwrights", slug: "wainwrights", expectedTotal: 214 },
  { name: "Munros", slug: "munros", expectedTotal: 282 },
  { name: "Nuttalls", slug: "nuttalls", expectedTotal: 443 },
];

function mountainBelongsToCollection(mountain, collectionSlug) {
  return (
    mountain.collection_memberships?.some(
      (membership) => membership.collection?.slug === collectionSlug
    ) || mountain.collection?.slug === collectionSlug
  );
}

function getMountainCollectionNames(mountain) {
  if (mountain.collection_memberships?.length) {
    return mountain.collection_memberships
      .map((membership) => membership.collection?.name)
      .filter(Boolean)
      .join(" / ");
  }

  return mountain.collection?.name || "Unlisted";
}

function getLogCollectionNames(log) {
  if (log.mountain_detail) {
    return getMountainCollectionNames(log.mountain_detail);
  }

  return "Unlisted";
}

function formatDate(dateValue) {
  if (!dateValue) return "No date";
  return new Date(dateValue).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

    const loggedMountainIds = new Set(logs.map((log) => log.mountain));

    const totalDistance = completedLogs.reduce(
      (total, log) => total + Number(log.hike_distance_km || 0),
      0
    );

    const totalHeight = mountains
      .filter((mountain) => completedMountainIds.has(mountain.id))
      .reduce((total, mountain) => total + Number(mountain.height_m || 0), 0);

    const collectionStats = DASHBOARD_COLLECTIONS.map((dashboardCollection) => {
      const apiCollection = collections.find(
        (collection) => collection.slug === dashboardCollection.slug
      );

      const collectionMountains = mountains.filter((mountain) =>
        mountainBelongsToCollection(mountain, dashboardCollection.slug)
      );

      const completedCount = collectionMountains.filter((mountain) =>
        completedMountainIds.has(mountain.id)
      ).length;

      const totalCount =
        apiCollection?.expected_total ||
        dashboardCollection.expectedTotal ||
        collectionMountains.length ||
        0;

      return {
        id: apiCollection?.id || dashboardCollection.slug,
        name: dashboardCollection.name,
        slug: dashboardCollection.slug,
        completed: completedCount,
        total: totalCount,
        percent: totalCount
          ? Math.round((completedCount / totalCount) * 100)
          : 0,
      };
    });

    const statusChartData = [
      { name: "Completed", value: completedLogs.length },
      { name: "Planned", value: plannedLogs.length },
      {
        name: "Remaining",
        value: Math.max(mountains.length - loggedMountainIds.size, 0),
      },
    ];

    const collectionChartData = collectionStats.map((collection) => ({
      name: collection.name,
      completed: collection.completed,
      remaining: Math.max(collection.total - collection.completed, 0),
    }));

    const recentLogs = [...logs]
      .sort(
        (a, b) =>
          new Date(b.completed_date || b.updated_at || b.created_at) -
          new Date(a.completed_date || a.updated_at || a.created_at)
      )
      .slice(0, 4);

    const nextObjective = plannedLogs[0] || null;

    const photoLogs = logs
      .filter((log) => log.uploaded_image)
      .slice(0, 4);

    const elevationPercent = Math.min(Math.round((totalHeight / 10000) * 100), 100);

    return {
      completed: completedLogs.length,
      planned: plannedLogs.length,
      totalVisible: mountains.length,
      totalDistance,
      totalHeight,
      collectionStats,
      statusChartData,
      collectionChartData,
      recentLogs,
      nextObjective,
      photoLogs,
      elevationPercent,
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

              <div className="dashboard-journey-grid">
                <article className="dashboard-journey-card dashboard-next-card">
                  <p className="section-kicker">Next objective</p>

                  {stats.nextObjective ? (
                    <>
                      <h3>{stats.nextObjective.mountain_detail?.name}</h3>
                      <p>
                        {getLogCollectionNames(stats.nextObjective)} /{" "}
                        {stats.nextObjective.mountain_detail?.region?.name}
                      </p>
                      <div className="dashboard-journey-meta">
                        <span>
                          {stats.nextObjective.mountain_detail?.height_m}m
                        </span>
                        <span>
                          {stats.nextObjective.route_taken || "Route not set"}
                        </span>
                      </div>
                      <Link to={`/mountains/${stats.nextObjective.mountain_detail?.slug}`}>
                        Open mountain
                      </Link>
                    </>
                  ) : (
                    <>
                      <h3>No objective planned yet</h3>
                      <p>Open a mountain and mark it as planned.</p>
                      <Link to="/mountains">Explore mountains</Link>
                    </>
                  )}
                </article>

                <article className="dashboard-journey-card dashboard-elevation-card">
                  <p className="section-kicker">Elevation climbed</p>
                  <h3>{Math.round(stats.totalHeight)}m</h3>

                  <div className="elevation-mountain">
                    <div
                      className="elevation-mountain__fill"
                      style={{ height: `${stats.elevationPercent}%` }}
                    />
                  </div>

                  <p>{stats.elevationPercent}% of a 10,000m milestone</p>
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

              <div className="dashboard-story-grid">
                <article className="dashboard-story-card">
                  <p className="section-kicker">Recent activity</p>
                  <h3>Latest mountain logs</h3>

                  <div className="dashboard-timeline">
                    {stats.recentLogs.length === 0 && (
                      <p>No recent activity yet.</p>
                    )}

                    {stats.recentLogs.map((log) => (
                      <Link
                        to={`/mountains/${log.mountain_detail?.slug}`}
                        className="dashboard-timeline-item"
                        key={log.id}
                      >
                        <span>{log.status === "completed" ? "✓" : "○"}</span>
                        <div>
                          <strong>{log.mountain_detail?.name}</strong>
                          <small>
                            {log.status} / {formatDate(log.completed_date)}
                          </small>
                        </div>
                      </Link>
                    ))}
                  </div>
                </article>

                <article className="dashboard-story-card">
                  <p className="section-kicker">Summit memories</p>
                  <h3>Recent photos</h3>

                  <div className="dashboard-photo-strip">
                    {stats.photoLogs.length === 0 && (
                      <p>No uploaded summit photos yet.</p>
                    )}

                    {stats.photoLogs.map((log) => (
                      <Link
                        to={`/mountains/${log.mountain_detail?.slug}`}
                        key={log.id}
                      >
                        <img
                          src={log.uploaded_image}
                          alt={log.mountain_detail?.name}
                        />
                      </Link>
                    ))}
                  </div>
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
                      to={`/collections/${collection.slug}`}
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
                        <p className="my-progress-card__status">{log.status}</p>
                        <h3>{log.mountain_detail?.name}</h3>
                        <p>
                          {getLogCollectionNames(log)} /{" "}
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