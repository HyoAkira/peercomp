import { useRef } from "react";
import { useKv, useToken } from "~/lib/store";
import { api } from "@peercomp/config";
export default function NewStorageModal() {
  const token = useToken((state) => state.token);
  const variableKey = useRef<HTMLInputElement>(null);
  const value = useRef<HTMLTextAreaElement>(null);
  const isEncrypted = useRef<HTMLInputElement>(null);
  const kv = useKv((state) => state.kv);
  const setKv = useKv((state) => state.setKv);
  const toggle = useRef<HTMLInputElement>(null);
  async function handleSave(
    event: MouseEvent<HTMLButtonElement, MouseEvent>
  ): void {
    event.preventDefault();
    const key = variableKey.current?.value;
    const val = value.current?.value;
    const check = isEncrypted.current?.checked;

    if (!key || !val) return alert("Key ve Value alanları boş bırakılamaz.");

    try {
      const response = await fetch(`${api.baseURL}${api.apiURL}kv/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          key,
          value: val,
          isEncrypted: check,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setKv([...kv, data.data]);
      toggle.current?.click();
    } catch (error) {
      console.log("KV Kayıt oluşturulurken hata oluştu:", error);
    }
  }

  return (
    <>
      <input
        ref={toggle}
        type="checkbox"
        id="storage_modal"
        className="modal-toggle"
      />

      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-4xl p-0">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold">K&V Kayıt </h3>

              <p className="text-sm opacity-60">Yeni kayıt ekle</p>
            </div>

            <label
              htmlFor="storage_modal"
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
                placeholder="user:1:profile"
                className="input input-bordered font-mono"
                ref={variableKey}
              />
            </div>

            {/* VALUE */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Value</span>
              </label>

              <textarea
                spellCheck={false}
                placeholder={`{
  "name": "John",
  "role": "admin"
}`}
                className="
                  textarea
                  textarea-bordered
                  h-80
                  w-full
                  resize-none
                  font-mono
                  text-sm
                "
                ref={value}
              />
            </div>

            {/* OPTIONS */}
            <div className="flex items-center gap-6">
              <label className="label cursor-pointer gap-3">
                <span className="label-text">Encrypt</span>

                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  ref={isEncrypted}
                />
              </label>
            </div>
          </div>

          {/* FOOTER */}
          <div className="modal-action border-t border-base-300 px-6 py-4 mt-0">
            <label htmlFor="storage_modal" className="btn btn-ghost">
              İptal
            </label>

            <button onClick={handleSave} className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </div>

        <label className="modal-backdrop" htmlFor="storage_modal">
          Close
        </label>
      </div>
    </>
  );
}
