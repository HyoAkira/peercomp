import { api } from "@peercomp/config";
import { bufferToBase64, IdentityKey } from "@peercomp/encryption/utils";
import { useRef } from "react";
import {
  useAlertMsg,
  useIdentityKey,
  useKv,
  usePeerNode,
  useToken,
} from "~/lib/store";
function JSONSanitizeCode(code) {
  return JSON.stringify(JSON.parse(code));
}

export default function EditStorageModalComponent({
  kvId,
  variableKey,
  value,
  isEncrypted,
  iv,
  metadata,
  author,
}: {
  kvId: string;
  variableKey?: string;
  value?: string;
  isEncrypted?: boolean;
  iv?: string;
  metadata?: any;
  author?: string;
}) {
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLTextAreaElement>(null);
  const encryptToggleRef = useRef<HTMLInputElement>(null);
  const setKv = useKv((state) => state.setKv);
  const kv = useKv((state) => state.kv);
  const token = useToken((state) => state.token);
  const toggle = useRef<HTMLInputElement>(null);
  const setAlertMsg = useAlertMsg((state) => state.setAlertMsg);
  const node = usePeerNode((state) => state.peerNode);
  const keyPair = useIdentityKey((state) => state.keyPair);
  async function handleSave(
    event: MouseEvent<HTMLButtonElement, MouseEvent>,
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
    const userInput = {
      key: keyInputRef.current?.value,
      value: JSONSanitizeCode(valueInputRef.current?.value),
      isEncrypted: encryptToggleRef.current?.checked,
    };
    try {
      const response = await fetch(`${api.baseURL}${api.apiURL}kv/${kvId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userInput),
      });

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
          data.data.key,
          signedValueByOwner,
          keyPair.publicKey,
        );
      }
      setKv(kv.map((item) => (item._id === kvId ? data.data : item)));
      toggle.current?.click();
      setAlertMsg("K&V kaydı başarıyla güncellendi.");
      setTimeout(() => setAlertMsg(""), 3000);
    } catch (error) {
      console.log("KV Kayıt güncellenirken hata oluştu:", error);
    }
  }

  return (
    <>
      <input
        type="checkbox"
        ref={toggle}
        id={`storage_modal_${kvId}`}
        className="modal-toggle"
      />

      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-4xl p-0">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold">K&V Kayıt </h3>

              <p className="text-sm opacity-60">Mevcut kaydı düzenleyin.</p>
            </div>

            <label
              htmlFor={`storage_modal_${kvId}`}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </label>
          </div>

          {/* CONTENT */}
          <div className="flex flex-col gap-5 p-6">
            {/* KEY */}
            <div className="form-control">
              <label className="label">
                <span className="label-text mr-2">Key</span>
              </label>

              <input
                type="text"
                placeholder={variableKey}
                className="input input-bordered font-mono"
                defaultValue={variableKey}
                ref={keyInputRef}
              />
            </div>

            {/* VALUE */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Value</span>
              </label>

              <textarea
                spellCheck={false}
                placeholder={value}
                defaultValue={value}
                ref={valueInputRef}
                className="
                  textarea
                  textarea-bordered
                  h-80
                  w-full
                  resize-none
                  font-mono
                  text-sm
                "
              />
            </div>

            {/* OPTIONS */}
            <div className="flex items-center gap-6">
              <label className="label cursor-pointer gap-3">
                <span className="label-text">Encrypt</span>

                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  defaultChecked={isEncrypted}
                  ref={encryptToggleRef}
                />
              </label>
            </div>
          </div>

          {/* FOOTER */}
          <div className="modal-action border-t border-base-300 px-6 py-4 mt-0">
            <label htmlFor={`storage_modal_${kvId}`} className="btn btn-ghost">
              İptal
            </label>

            <button onClick={handleSave} className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </div>

        <label className="modal-backdrop" htmlFor={`storage_modal_${kvId}`}>
          Close
        </label>
      </div>
    </>
  );
}
