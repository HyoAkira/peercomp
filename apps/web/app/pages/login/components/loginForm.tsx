import { api } from "@peercomp/config";
import { useRef } from "react";
import { Navigate, useNavigate } from "react-router";
import { useToken } from "~/lib/store";

export default function LoginFormComponent() {
  const form = useRef<HTMLFormElement>(null);
  const setToken = useToken((state)=> state.setToken);
  const navigate = useNavigate();
 async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(form.current!);
    const email = formData.get("email");
    const password = formData.get("password");
  
    const url = `${api.baseURL}${api.apiURL}users/login`;
const options = {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  body: JSON.stringify({
    email,
    password
  })
};

try {
  const response = await fetch(url, options);
  const data = await response.json();
  if(!data.error){
    setToken(data.data.token);
    navigate("/panel");
  }
} catch (error) {
  console.error(error);
}
  }
  return (
    <form ref={form} method="post"  onSubmit={handleSubmit}>
      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <legend className="fieldset-legend">Giriş Yap</legend>

        <label className="label">E-posta</label>
        <input type="email" name="email" className="input" placeholder="E-posta" />

        <label className="label">Şifre</label>
        <input type="password" name="password" className="input" placeholder="Şifre" />

        <button type="submit" className="btn btn-neutral mt-4">Giriş Yap</button>
      </fieldset>
    </form>
  );
}
