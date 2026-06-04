import FooterComponent from "../components/footer";
import NavbarComponent from "../components/navbar";
import LoginFormComponent from "./components/loginForm";
import SignUpFormComponent from "./components/registerForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavbarComponent />
      <main className="flex-1 flex items-center justify-center">
        <SignUpFormComponent/>
      </main>
      <FooterComponent />
    </div>
  );
}
