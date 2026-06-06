import { api } from "@peercomp/config";
import { useEffect, useRef, useState } from "react";
import { IdentityKey, type SerializedIdentityKey } from "@peercomp/encryption/utils";
import { useAlertMsg, useIdentityKey, useToken } from "~/lib/store";
import SettingsKeyPairCard from "./components/settingsKeyPairCard";
import SettingsPasswordCard from "./components/settingsPasswordCard";
import SettingsProfileCard from "./components/settingsProfileCard";
export default function SettingsPage() {
  type ProfileForm = {
    name: string;
    surname: string;
    email: string;
  };

  type PasswordForm = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };

  const defaultProfile: ProfileForm = {
    name: "",
    surname: "",
    email: "",
  };

  const defaultPasswordForm: PasswordForm = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profile, setProfile] = useState<ProfileForm>(defaultProfile);
  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>(defaultPasswordForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const token = useToken((state) => state.token);
  const keyPair = useIdentityKey((state) => state.keyPair);
  const setKeyPair = useIdentityKey((state) => state.setKeyPair);
  const setAlertMsg = useAlertMsg((state) => state.setAlertMsg);

  function showAlert(message: string): void {
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    setAlertMsg(message);
    alertTimeoutRef.current = setTimeout(() => {
      setAlertMsg("");
    }, 3000);
  }
  useEffect(() => {
    if (!token) return;
    (async () => {
      const url = `${api.baseURL}${api.apiURL}/users/me`;
      const options = {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      };

      try {
        const response = await fetch(url, options);
        const data = await response.json();

        setProfile(data.data);
        if (!response.ok || data.error) {
          showAlert(data.message || "Profil bilgileri alınamadı.");
          return;
        }
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [token]);

  // Load keypair from backend on page load
  useEffect(() => {
    if (!token) return;
    (async () => {
      const url = `${api.baseURL}${api.apiURL}/users/keypair`;
      const options = {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
      };

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (response.ok && data.data && data.data.publicKey && data.data.privateKey) {
          setKeyPair(data.data as SerializedIdentityKey);
        }
      } catch (error) {
        console.error("Failed to load keypair:", error);
      }
    })();
  }, [token, setKeyPair]);

  function handleProfileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    setProfile((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  async function saveProfile(
    e: React.SyntheticEvent<HTMLFormElement>,
  ): Promise<void> {
    e.preventDefault();
    if (!profile) return;
    const url = `${api.baseURL}${api.apiURL}/users/update-profile`;
    const options = {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(profile),
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (data.error) {
        showAlert(data.message || "Profil güncellenemedi.");
        return;
      }

      showAlert(data.message || "Profil başarıyla güncellendi.");
    } catch (error) {
      console.error(error);
      showAlert("Profil güncellenirken bir hata oluştu.");
    }
  }

  function handlePasswordChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    setPasswordForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  async function savePassword(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const { confirmPassword, currentPassword, newPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      console.error("Şifre alanlarının tamamı doldurulmalı.");
      return;
    }

    if (newPassword !== confirmPassword) {
      console.error("Yeni şifreler eşleşmiyor.");
      return;
    }

    const url = `${api.baseURL}${api.apiURL}/users/change-password`;
    const options = {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        password: currentPassword,
        newPassword,
        checkNewPassword: confirmPassword,
      }),
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (data.error) {
        showAlert(data.message || "Şifre değiştirilemedi.");
        return;
      }

      setPasswordForm(defaultPasswordForm);
      showAlert(data.message || "Şifre başarıyla değiştirildi.");
    } catch (error) {
      console.error(error);
      showAlert("Şifre değiştirilirken bir hata oluştu.");
    }
  }

  async function handleGenerateKeyPair(): Promise<void> {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const owner = await IdentityKey.generate();
      const exported = await owner.export();
      setKeyPair(exported);
      
      // Persist to backend
      const url = `${api.baseURL}${api.apiURL}/users/update-keypair`;
      const options = {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(exported),
      };
      
      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok || data.error) {
          console.error("Failed to persist keypair to backend:", data.message);
        }
      } catch (backendError) {
        console.error("Backend keypair sync failed:", backendError);
      }
      
      showAlert("Anahtar çifti başarıyla oluşturuldu.");
    } catch (error) {
      console.error(error);
      showAlert("Anahtar çifti oluşturulurken bir hata oluştu.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDownloadKeyPair(): void {
    if (!keyPair) return;
    const blob = new Blob([JSON.stringify(keyPair, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "identity-keypair.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showAlert("Anahtar çifti indirildi.");
  }

  function openUploadDialog(): void {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  }

  async function handleUploadKeyPair(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;
    if (keyPair) {
      showAlert("Zaten bir anahtar çifti var. Önce mevcut çifti silin.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          typeof parsed.publicKey !== "string" ||
          typeof parsed.privateKey !== "string"
        ) {
          throw new Error("Geçersiz anahtar çifti dosyası.");
        }
        const uploadedKeypair = parsed as SerializedIdentityKey;
        setKeyPair(uploadedKeypair);
        
        // Persist to backend
        const url = `${api.baseURL}${api.apiURL}/users/update-keypair`;
        const options = {
          method: "POST",
          headers: {
            authorization: `Bearer ${token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(uploadedKeypair),
        };
        
        try {
          const response = await fetch(url, options);
          const data = await response.json();
          if (!response.ok || data.error) {
            console.error("Failed to persist keypair to backend:", data.message);
          }
        } catch (backendError) {
          console.error("Backend keypair sync failed:", backendError);
        }
        
        showAlert("Anahtar çifti başarıyla yüklendi.");
      } catch (error) {
        console.error(error);
        showAlert("Anahtar çifti yüklenirken hata: geçersiz dosya formatı.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="grid items-start gap-6 lg:grid-cols-2">
      <SettingsProfileCard
        profile={profile}
        onChange={handleProfileChange}
        onSubmit={saveProfile}
      />

      <SettingsPasswordCard
        passwordForm={passwordForm}
        onChange={handlePasswordChange}
        onSubmit={savePassword}
      />

      <SettingsKeyPairCard
        keyPair={keyPair}
        isGenerating={isGenerating}
        onGenerate={handleGenerateKeyPair}
        onDownload={handleDownloadKeyPair}
        onOpenUploadDialog={openUploadDialog}
        onUpload={handleUploadKeyPair}
        fileInputRef={fileInputRef}
      />
    </main>
  );
}
