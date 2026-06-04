import { api } from "@peercomp/config";
import { useRef } from "react";
import { useNavigate } from "react-router";
import { useToken } from "~/lib/store";

export default function SignUpFormComponent() {
  const form = useRef<HTMLFormElement>(null);
  const setToken = useToken((state) => state.setToken);
  const navigate = useNavigate();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(form.current!);
    const data = Object.fromEntries(formData.entries());
    /** check password repeat */
    const { confirmPassword, password } = data;

    if (password !== confirmPassword) {
      console.error("Şifreler eşleşmiyor.");
      return;
    }

    const url = `${api.baseURL}${api.apiURL}users/create`;
    const options = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!data.error) {
        setToken(data.data.token);
        navigate("/login");
      }
    } catch (error) {
      console.error(error);
    }
  }
  return (
    <form ref={form} onSubmit={handleSubmit}>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Kayıt Ol</legend>

        <label className="label">Ad</label>
        <input type="text" name="name" className="input" placeholder="Ad" />

        <label className="label">Soyad</label>
        <input
          type="text"
          name="surname"
          className="input"
          placeholder="Soyad"
        />

        <label className="label">Kullanıcı Adı</label>
        <input
          type="text"
          name="username"
          className="input"
          placeholder="Kullanıcı Adı"
        />

        <label className="label">E-posta</label>
        <input
          type="email"
          name="email"
          className="input"
          placeholder="E-posta"
        />

        <label className="label">Şifre</label>
        <input
          type="password"
          name="password"
          className="input"
          placeholder="Şifre"
        />

        <label className="label">Şifre Tekrar</label>
        <input
          type="password"
          name="confirmPassword"
          className="input"
          placeholder="Şifre Tekrar"
        />

        <button type="submit" className="btn btn-neutral mt-4">
          Kayıt Ol
        </button>
      </fieldset>
    </form>
  );
}
