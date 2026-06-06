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
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search"
          className="input input-bordered w-24 md:w-auto"
        />
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-10 rounded-full flex items-center justify-center bg-primary text-primary-content">
              {/* <img
                alt="Tailwind CSS Navbar component"
                src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
              /> */}
              <div className="font-bold text-primary-content">J.D</div>
            </div>
          </div>
          <ul
            tabIndex="-1"
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow font-semibold"
          >
            <li>
              <Link to="/panel/settings">Settings</Link>
            </li>
            <li>
              <button
                onClick={() => {
                  setToken("");
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
