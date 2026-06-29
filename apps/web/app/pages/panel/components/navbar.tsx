import { Link, useNavigate } from "react-router";
import { useToken } from "~/lib/store";
import icons from "./icons";

export default function PanelNavbarComponent() {
  const setToken = useToken((state) => state.setToken);
  const navigate = useNavigate();
  return (
    <div className="navbar bg-base-100 shadow-sm rounded-box">
      <label
        htmlFor="my-drawer-4"
        aria-label="open sidebar"
        className="btn btn-square btn-ghost lg:hidden"
      >
        {/* Sidebar toggle icon */}
        {icons.sidebartoggle}
      </label>
      <div className="divider"></div>
      <div className="flex-1">
        <a className="btn btn-ghost text-xl">PeerComp</a>
      </div>

    </div>
  );
}
