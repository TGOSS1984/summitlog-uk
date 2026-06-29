import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./components/layout/Layout";
import AccountPage from "./pages/AccountPage";
import CollectionDetailPage from "./pages/CollectionDetailPage";
import DashboardPage from "./pages/DashboardPage";
import GalleryPage from "./pages/GalleryPage";
import HomePage from "./pages/HomePage";
import JournalPage from "./pages/JournalPage";
import LogRoutePage from "./pages/LogRoutePage";
import MapPage from "./pages/MapPage";
import MountainDetailPage from "./pages/MountainDetailPage";
import MountainsPage from "./pages/MountainsPage";
import MountainsProgressPage from "./pages/MountainsProgressPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegionDetailPage from "./pages/RegionDetailPage";
import SharePage from "./pages/SharePage";
import SharedProgressPage from "./pages/SharedProgressPage";
import SharedDashboardPage from "./pages/SharedDashboardPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true,                    element: <HomePage /> },
      { path: "mountains",              element: <MountainsPage /> },
      { path: "mountains/progress",     element: <MountainsProgressPage /> },
      { path: "mountains/:slug",        element: <MountainDetailPage /> },
      { path: "dashboard",              element: <DashboardPage /> },
      { path: "map",                    element: <MapPage /> },
      { path: "account",                element: <AccountPage /> },
      { path: "collections/:slug",      element: <CollectionDetailPage /> },
      { path: "regions/:slug",          element: <RegionDetailPage /> },
      { path: "journal",                element: <JournalPage /> },
      { path: "gallery",                element: <GalleryPage /> },
      { path: "log-route",              element: <LogRoutePage /> },
      { path: "log-route/:id/edit",     element: <LogRoutePage /> },
      { path: "*",                      element: <NotFoundPage /> },
      { path: "/share/log/:id",         element: <SharePage /> },
      { path: "/share/progress/:token", element: <SharedProgressPage /> },
      { path: "/share/dashboard/:token", element: <SharedDashboardPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;