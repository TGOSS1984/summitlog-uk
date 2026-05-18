import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./components/layout/Layout";
import AccountPage from "./pages/AccountPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import MountainsPage from "./pages/MountainsPage";
import MountainDetailPage from "./pages/MountainDetailPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "mountains", element: <MountainsPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "map", element: <MapPage /> },
      { path: "account", element: <AccountPage /> },
      {path:"mountains/:slug", element: <MountainDetailPage/>}
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;