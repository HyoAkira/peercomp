import { type ChangeEvent, type RefObject } from "react";
import { type SerializedIdentityKey } from "@peercomp/encryption/utils";

type SettingsKeyPairCardProps = {
  keyPair: SerializedIdentityKey | null;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
  onDownload: () => void;
  onOpenUploadDialog: () => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

export default function SettingsKeyPairCard({
  keyPair,
  isGenerating,
  onGenerate,
  onDownload,
  onOpenUploadDialog,
  onUpload,
  fileInputRef,
}: Readonly<SettingsKeyPairCardProps>) {
  return (
    <section className="card bg-base-200 border border-base-300 shadow-sm">
      <div className="card-body">
        <h2 className="card-title">Anahtar Çifti İçe Aktar & Dışa Aktar</h2>
        <p className="text-sm opacity-70">
          Anahtar çifti oluşturun, indirerek yedekleyin veya dosyadan yükleyin. <br/>
          Anahtar çifti, mesajlarınızın güvenliği için gereklidir. <br/> Yeni bir anahtar çifti oluşturmak, eski anahtar çiftinizi geçersiz kılar ve yeni anahtar çiftiyle şifrelenmiş mesajlar almanızı sağlar. <br/>
          Anahtar çiftinizi kaybetmeyin, çünkü kaybolan anahtar çiftiyle şifrelenmiş mesajlara erişemezsiniz. <br/>
        </p>

        <div className="alert alert-info">
          <span>
            {keyPair
              ? "Aktif anahtar çifti bulundu."
              : "Henüz anahtar çifti oluşturulmadı veya yüklenmedi."}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Oluşturuluyor..." : "Anahtar Çifti Oluştur"}
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={onDownload}
          >
            Anahtar Çiftini İndir
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenUploadDialog}
          >
            Anahtar Çifti Yükle
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="application/json,.json"
            onChange={onUpload}
          />
        </div>
      </div>
    </section>
  );
}
