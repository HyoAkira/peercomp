import { type ChangeEvent, type SyntheticEvent } from "react";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SettingsPasswordCardProps = {
  passwordForm: PasswordForm;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>;
};

export default function SettingsPasswordCard({
  passwordForm,
  onChange,
  onSubmit,
}: Readonly<SettingsPasswordCardProps>) {
  return (
    <section className="card bg-base-200 border border-base-300 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Şifre Değiştirme</h2>
        <p className="text-sm opacity-70">
          Mevcut şifrenizi girin, yeni şifrenizi iki kez doğrulayın.
        </p>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="label" htmlFor="settings-current-password">
            Eski Şifre
          </label>
          <input
            id="settings-current-password"
            name="currentPassword"
            type="password"
            className="input input-bordered"
            placeholder="Eski şifre"
            value={passwordForm.currentPassword}
            onChange={onChange}
          />

          <label className="label" htmlFor="settings-new-password">
            Yeni Şifre
          </label>
          <input
            id="settings-new-password"
            name="newPassword"
            type="password"
            className="input input-bordered"
            placeholder="Yeni şifre"
            value={passwordForm.newPassword}
            onChange={onChange}
          />

          <label className="label" htmlFor="settings-confirm-password">
            Yeni Şifre Tekrar
          </label>
          <input
            id="settings-confirm-password"
            name="confirmPassword"
            type="password"
            className="input input-bordered"
            placeholder="Yeni şifreyi tekrar girin"
            value={passwordForm.confirmPassword}
            onChange={onChange}
          />

          <div className="pt-2">
            <button type="submit" className="btn btn-primary">
              Şifreyi Güncelle
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
