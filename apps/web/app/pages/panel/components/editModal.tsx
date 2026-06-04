import { api } from "@peercomp/config";
import { useRef, useState } from "react";
import { useAlertMsg, useFunctions, usePeerNode, useToken } from "~/lib/store";
import CodeEditor from "@uiw/react-textarea-code-editor"; // <-- Paket eklendi

type FunctionMethod = "GET" | "POST";

export default function EditModalComponent({
  name,
  method,
  functionId,
  endpoint,
  code,
}: Readonly<{
  name: string;
  method: string;
  functionId: string;
  endpoint: string;
  code: string;
}>) {
  const [inputName, setName] = useState(name);
  const [inputEndpoint, setEndpoint] = useState(endpoint);
  const token = useToken((state) => state.token);
  const setAlertMsg = useAlertMsg((state) => state.setAlertMsg);
  const functions = useFunctions((state) => state.functions);
  const toggle = useRef<HTMLInputElement>(null);
  const setFunctions = useFunctions((state) => state.setFunctions);
  const node = usePeerNode((state) => state.peerNode);
  const [inputMethod, setMethod] = useState<FunctionMethod>(
    method as FunctionMethod
  );

  const [inputCode, setCode] = useState(code);

  async function handleSave(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ): Promise<void> {
    event.preventDefault();

    const userInput = {
      name: inputName,
      endpoint: inputEndpoint,
      method: inputMethod,
      code: inputCode,
    };

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
        }
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setFunctions(
        functions.map((func) => (func._id === functionId ? data.data : func))
      );

      if (node) {
        console.log("Updated function:", data.data);
        await node.store(data.data.endpoint, data.data); // Peer'e de kaydet
      }
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
            <div className="border-r border-base-300 bg-base-200/30 p-5 flex flex-col gap-5">
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
            </div>

            {/* CODE EDITOR */}
            <div className="flex flex-col bg-base-100">
              <div className="border-b border-base-300 bg-base-200/40 px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-base-content/70">index.js</span>
                <span className="badge badge-sm badge-neutral">javascript</span>
              </div>

              {/* Arka plan doğrudan base-100 yapıldı ve taşma scroll ile sınırlandırıldı */}
              <div className="flex-1 min-h-[480px] max-h-[600px] overflow-auto bg-base-100">
                <CodeEditor
                  value={inputCode}
                  language="js"
                  placeholder="JavaScript kodunuzu buraya yazın..."
                  onChange={(evn) => setCode(evn.target.value)}
                  padding={20}
                  style={{
                    fontSize: 14,
                    fontFamily: 'ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace',
                    minHeight: "100%",
                  }}
                  data-color-mode="dark" // Kullandığın temaya göre 'light' olarak da değiştirebilirsin
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