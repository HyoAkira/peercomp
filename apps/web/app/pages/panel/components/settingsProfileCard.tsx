import { type ChangeEvent, type SyntheticEvent } from "react";

type ProfileForm = {
  name: string;
  surname: string;
  email: string;
};

type SettingsProfileCardProps = {
  profile: ProfileForm;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
};

export default function SettingsProfileCard({
  profile,
  onChange,
  onSubmit,
}: Readonly<SettingsProfileCardProps>) {
  return (
    <section className="card bg-base-200 border border-base-300 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Profil Düzenleme</h2>
        <p className="text-sm opacity-70">Hesap bilgilerinizi düzenleyin.</p>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="label" htmlFor="settings-name">
            Ad
          </label>
          <input
            id="settings-name"
            name="name"
            type="text"
            className="input input-bordered"
            placeholder="Ad"
            value={profile.name}
            onChange={onChange}
          />

          <label className="label" htmlFor="settings-surname">
            Soyad
          </label>
          <input
            id="settings-surname"
            name="surname"
            type="text"
            className="input input-bordered"
            placeholder="Soyad"
            value={profile.surname}
            onChange={onChange}
          />

          <label className="label" htmlFor="settings-email">
            E-posta
          </label>
          <input
            id="settings-email"
            name="email"
            type="email"
            className="input input-bordered"
            placeholder="E-posta"
            value={profile.email}
            onChange={onChange}
          />

          <div className="pt-2">
            <button type="submit" className="btn btn-primary">
              Profili Kaydet
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
