import { Link } from "react-router";

export default function NavbarComponent() {
  return (
    <nav className="m-2 w-[92%] max-w-6xl mx-auto mt-4 navbar bg-base-100 shadow-sm rounded-xl px-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <Link to="/" className="text-xl font-bold">
        PeerComp
      </Link>

      <ul className="menu menu-vertical lg:menu-horizontal bg-base-200 rounded-box font-semibold">
        <li>
          <Link to="/services">Servisler</Link>
        </li>
        <li>
          <Link to="/whyus">Neden Biz?</Link>
        </li>
        <li>
          <Link to="/faq">SSS</Link>
        </li>
      </ul>

      <ul className="menu menu-horizontal bg-primary text-primary-content rounded-box font-semibold">
        <li>
          <Link to="/login">Giriş Yap</Link>
        </li>
        <li>
          <Link to="/register">Kayıt Ol</Link>
        </li>
      </ul>
    </nav>
  );
}
