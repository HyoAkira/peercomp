import { Outlet } from "react-router";
import PanelSidebarComponent from "./components/sidebar";
import PanelNavbarComponent from "./components/navbar";
import PanelGuard from "~/components/panelGuard";
import AlertComponent from "./components/alert";

export default function Layout() {

  return (
    <div className="flex min-h-screen">
      
      <PanelGuard />
      <PanelSidebarComponent outlet={<Outlet />} />
    </div>
  );
}
