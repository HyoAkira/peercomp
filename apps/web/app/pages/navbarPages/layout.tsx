import { Outlet } from "react-router";
import FooterComponent from "../components/footer";
import NavbarComponent from "../components/navbar";

export default function NavbarPagesLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarComponent />
      <main className="flex-1 flex flex-col p-16 gap-4">
        <Outlet></Outlet>
      </main>
      <FooterComponent />
    </div>
  );
}
