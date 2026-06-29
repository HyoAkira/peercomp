import { api } from "@peercomp/config";
import { bufferToBase64, IdentityKey } from "@peercomp/encryption/utils";
import CodeEditor from "@uiw/react-textarea-code-editor"; // <-- Paket eklendi
import { useRef, useState } from "react";
import { minify } from "terser";
import {
  useAlertMsg,
  useFunctions,
  useIdentityKey,
  usePeerNode,
  useToken,
} from "~/lib/store";
type FunctionMethod = "GET" | "POST";

type KvPermissionProp = {
  enabled: boolean;
  allowedKeys: string[];
  expiresAt: number | string;
} | null | undefined;

function computeRemainingHours(expiresAt: number | string | undefined): string {
  if (!expiresAt) return "24";
  const ts =
    typeof expiresAt === "string" ? Date.parse(expiresAt) : expiresAt;
  if (!ts || Number.isNaN(ts)) return "24";
  const diffMs = ts - Date.now();
  if (diffMs <= 0) return "1";
  const hours = Math.ceil(diffMs / (3600 * 1000));
  return String(hours);
}

export default function EditModalComponent({
  name,
  method,
  functionId,
  endpoint,
  code,
  kvPermission,
}: Readonly<{
  name: string;
  method: string;
  functionId: string;
  endpoint: string;
  code: string;
  kvPermission?: KvPermissionProp;
}>) {
  const [inputName, setName] = useState(name);
  const keyPair = useIdentityKey((state) => state.keyPair);
  const [inputEndpoint, setEndpoint] = useState(endpoint);
  const token = useToken((state) => state.token);
  const setAlertMsg = useAlertMsg((state) => state.setAlertMsg);
  const setFunctions = useFunctions((state) => state.setFunctions);
  const toggle = useRef<HTMLInputElement>(null);
  const node = usePeerNode((state) => state.peerNode);
  const [inputMethod, setMethod] = useState<FunctionMethod>(
    method as FunctionMethod,
  );

  const [inputCode, setCode] = useState(code);

  // === KV YETKİ ALANI STATE'LERİ (mevcut değerlerle başlatılır) ===
  const [kvEnabled, setKvEnabled] = useState<boolean>(
    Boolean(kvPermission?.enabled),
  );
  const [kvPatterns, setKvPatterns] = useState<string>(
    (kvPermission?.allowedKeys ?? []).join(", "),
  );
  const [kvHours, setKvHours] = useState<string>(
    computeRemainingHours(kvPermission?.expiresAt),
  );

  async function handleSave(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ): Promise<void> {
    event.preventDefault();
    if (!keyPair) {
      toggle.current?.click();
      setAlertMsg("Lütfen önce bir anahtar çifti oluşturun.");
      setTimeout(() => {
        setAlertMsg("");
      }, 3000);
      return;
    }

    // 1) Kodu minify et
    let finalCode = inputCode;
    const minifiedResult = await minify(inputCode, {
      mangle: false,
      parse: {
        bare_returns: true,
      },
      compress: {
        dead_code: true,
        drop_debugger: true,
        module: true,
      },
      format: {
        comments: false,
      },
    });
    if (minifiedResult && minifiedResult.code) {
      finalCode = minifiedResult.code;
    }

    // 2) KV payload kararı (3'lü mantık)
    //    - kvEnabled === true  => yeni delegate key + token üret, payload'a ekle
    //    - kvEnabled === false ve eskiden açıktı => payload'a null koy (kapat)
    //    - kvEnabled === false ve eskiden kapalıydı => payload'a hiç ekleme (dokunma)
    let kvPermissionPayload: any = undefined; // "hiç gönderme" sinyali
    if (kvEnabled) {
      const allowedKeys = kvPatterns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (allowedKeys.length === 0) {
        setAlertMsg("En az bir key pattern girin.");
        setTimeout(() => setAlertMsg(""), 3000);
        return;
      }
      if (!kvHours || parseInt(kvHours) < 1) {
        setAlertMsg("Geçerli bir süre girin.");
        setTimeout(() => setAlertMsg(""), 3000);
        return;
      }

      // Bu fonksiyona özel yeni bir IdentityKey üret (eskiyi geçersiz kılar)
      const functionIdentity = await IdentityKey.generate();
      const functionIdentityPub = await functionIdentity.exportPublicKey();
      const functionIdentityExport = await functionIdentity.export();

      const expiresAt = Date.now() + parseInt(kvHours) * 3600 * 1000;

      // Owner olarak token'ı imzala
      const owner = await IdentityKey.import(keyPair);
      const tokenDataToSign = JSON.stringify({
        delegatePublicKey: functionIdentityPub,
        allowedKeys,
        expiresAt,
      });
      const ownerSigBuf = await owner.sign(tokenDataToSign);

      kvPermissionPayload = {
        enabled: true,
        allowedKeys,
        expiresAt,
        delegationToken: {
          delegatePublicKey: functionIdentityPub,
          allowedKeys,
          expiresAt,
          ownerSignature: bufferToBase64(ownerSigBuf),
        },
        functionIdentity: functionIdentityExport,
      };
    } else if (kvPermission?.enabled) {
      // Daha önce açıktı, şimdi kapatılıyor
      kvPermissionPayload = null;
    }

    // 3) PUT payload
    const userInput: any = {
      name: inputName,
      endpoint: inputEndpoint,
      method: inputMethod,
      code: finalCode,
    };
    if (kvPermissionPayload !== undefined) {
      userInput.kvPermission = kvPermissionPayload;
    }

    try {
      const response = await fetch(
        `${api.baseURL}${api.apiURL}functions/${functionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userInput),
        },
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (node) {
        const owner = await IdentityKey.import(keyPair);
        const ownerPayload = JSON.stringify(data.data);
        const ownerSigBuf = await owner.sign(ownerPayload);
        const ownerSignature = bufferToBase64(ownerSigBuf);
        const signedValueByOwner = {
          payload: ownerPayload,
          ownerSignature: ownerSignature,
        };
        await node.storeWithSignature(
          data.data.endpoint,
          signedValueByOwner,
          keyPair.publicKey,
        );
      }
      setFunctions(
        useFunctions.getState().functions.map((func) => (func._id === functionId ? data.data : func)),
      );

      toggle.current?.click();
      setAlertMsg("Fonksiyon başarıyla güncellendi.");
      setTimeout(() => setAlertMsg(""), 3000);
    } catch (error) {
      console.log("Fonksiyon güncellenirken hata oluştu:", error);
    }
  }

  return (
    <>
      <input
        type="checkbox"
        ref={toggle}
        id={`edit_modal_${functionId}`}
        className="modal-toggle"
      />

      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-6xl p-0 overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold">Fonksiyonu Düzenle</h3>
            </div>

            <label
              htmlFor={`edit_modal_${functionId}`}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </label>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] min-h-[550px]">
            {/* SIDEBAR */}
            <div className="border-r border-base-300 bg-base-200/30 p-5 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Fonksiyon Adı</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="getUserData"
                  value={inputName}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Endpoint</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  placeholder="/api/user"
                  value={inputEndpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">HTTP Method</span>
                </label>
                <select
                  className="select select-bordered"
                  value={inputMethod}
                  onChange={(e) => setMethod(e.target.value as FunctionMethod)}
                >
                  <option>GET</option>
                  <option>POST</option>
                </select>
              </div>

              {/* === KV YAZMA YETKİ ALANI === */}
              <div className="divider text-xs">KV Yazma Yetkisi</div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={kvEnabled}
                    onChange={(e) => setKvEnabled(e.target.checked)}
                  />
                  <span className="label-text">
                    Bu fonksiyon KV'ye yazabilsin
                  </span>
                </label>
              </div>

              {kvEnabled && (
                <>
                  <div className="alert alert-info py-2 px-3 text-xs">
                    <span>
                      🔒 Güvenlik: Yazma süresi sınırı dolduğunda fonksiyon KV
                      yazma yetkisini kaybedecektir. Yeni bir süre ile yenilenebilir.
                    </span>
                  </div>

                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text">
                        İzin Verilen Anahtar Pattern'ları
                      </span>
                    </label>
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      placeholder="posts/*, profile/avatar, settings/*"
                      value={kvPatterns}
                      onChange={(e) => setKvPatterns(e.target.value)}
                    />
                    <span className="label-text-alt mt-1">
                      Virgülle ayır. * = wildcard
                    </span>
                  </div>

                  <div className="form-control">
                    <label className="label py-1">
                      <span className="label-text">
                        Geçerlilik Süresi (saat)
                      </span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input input-bordered input-sm"
                      placeholder="24"
                      value={kvHours}
                      onChange={(e) => setKvHours(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* CODE EDITOR */}
            <div className="flex flex-col bg-base-100">
              <div className="border-b border-base-300 bg-base-200/40 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-base-content/70">
                  index.js
                </span>
                <span className="badge badge-sm badge-neutral">javascript</span>
              </div>

              <div className="flex-1 min-h-[480px] max-h-[600px] overflow-auto custom-scrollbar">
                <CodeEditor
                  value={inputCode}
                  language="js"
                  placeholder="JavaScript kodunuzu buraya yazın..."
                  onChange={(evn) => setCode(evn.target.value)}
                  padding={20}
                  style={{
                    fontSize: 14,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
                    minHeight: "100%",
                  }}
                  data-color-mode="dark"
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="modal-action border-t border-base-300 px-6 py-4 mt-0 bg-base-200/20">
            <label
              htmlFor={`edit_modal_${functionId}`}
              className="btn btn-ghost"
            >
              İptal
            </label>
            <button onClick={handleSave} className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
