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
import NotFoundPage from "./pages/NotFoundPage";
import RegionDetailPage from "./pages/RegionDetailPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true,                  element: <HomePage /> },
      { path: "mountains",            element: <MountainsPage /> },
      { path: "mountains/:slug",      element: <MountainDetailPage /> },
      { path: "dashboard",            element: <DashboardPage /> },
      { path: "map",                  element: <MapPage /> },
      { path: "account",              element: <AccountPage /> },
      { path: "collections/:slug",    element: <CollectionDetailPage /> },
      { path: "regions/:slug",        element: <RegionDetailPage /> },
      { path: "journal",              element: <JournalPage /> },
      { path: "gallery",              element: <GalleryPage /> },
      { path: "log-route",            element: <LogRoutePage /> },
      { path: "*",                    element: <NotFoundPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
