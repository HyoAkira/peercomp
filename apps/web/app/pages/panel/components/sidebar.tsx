import { Link } from "react-router";
import AlertComponent from "./alert";
import icons from "./icons";
import PanelNavbarComponent from "./navbar";
import { useAlertMsg } from "~/lib/store";

export default function PanelSidebarComponent({
  outlet,
}: {
  outlet: React.ReactNode;
}) {
  const alertMsg = useAlertMsg((state) => state.alertMsg);
  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-4" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {/* Navbar */}
        <nav className="navbar w-full">
          <PanelNavbarComponent />
        </nav>
        <AlertComponent msg={alertMsg} />
        {/* Page content here */}
        <div className="p-4">{outlet}</div>
      </div>

      <div className="drawer-side is-drawer-close:overflow-visible">
        <label
          htmlFor="my-drawer-4"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
          {/* Sidebar content here */}
          <ul className="menu w-full grow">
            {/* List item */}
            <label
              htmlFor="my-drawer-4"
              aria-label="open sidebar"
              className="btn btn-square btn-ghost"
            >
              {/* Sidebar toggle icon */}
              {icons.sidebartoggle}
            </label>
            <div className="divider"></div>

            <SidebarItem icon={icons.home} label="Anasayfa" to="/panel" />
            <SidebarItem
              icon={icons.functions}
              label="Fonksiyonlar"
              to="/panel/functions"
            />
            <SidebarItem
              icon={icons.kv}
              label="K&V Veritabanı"
              to="/panel/kv"
            />
            <SidebarItem
              icon={icons.settings}
              label="Ayarlar"
              to="/panel/settings"
            />
          </ul>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  icon,
  to,
}: {
  label: string;
  icon: React.ReactNode;
  to: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="is-drawer-close:tooltip is-drawer-close:tooltip-right font-semibold"
        data-tip={label}
      >
        {icon}
        <span className="is-drawer-close:hidden">{label}</span>
      </Link>
    </li>
  );
}
