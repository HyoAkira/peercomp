import { api } from "@peercomp/config";
import { IdentityKey } from "@peercomp/encryption/utils";
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

export default function NewFuncModal({}: Readonly<{}>) {
  const token = useToken((state) => state.token);
  const setFunctions = useFunctions((state) => state.setFunctions);
  const functions = useFunctions((state) => state.functions);
  const toggle = useRef<HTMLInputElement>(null);
  const [inputName, setName] = useState("");
  const [inputEndpoint, setEndpoint] = useState("");
  const setAlertMsg = useAlertMsg((state) => state.setAlertMsg);
  const node = usePeerNode((state) => state.peerNode);
  const keyPair = useIdentityKey((state) => state.keyPair);
  const [inputMethod, setMethod] = useState<FunctionMethod>(
    "GET" as FunctionMethod,
  );

  const [inputCode, setCode] = useState(`(async ()=> {
  const user = await fetch("https://jsonplaceholder.typicode.com/users/1").then(res=>res.json());
  return user;
})`);

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
    const url = `${api.baseURL}${api.apiURL}functions/create`;
    let finalCode = inputCode;
    const minifiedResult = await minify(inputCode, {
      mangle: false,
      parse: {
        bare_returns: true, // Return ifadelerinin etrafına süslü parantez eklemeden bırakır
      },
      compress: {
        dead_code: true,
        drop_debugger: true,
        module: true,
      },
      format: {
        comments: false, // Yorum satırlarını da silsin
      },
    });

    if (minifiedResult && minifiedResult.code) {
      finalCode = minifiedResult.code;
    }
    const ownerPublicKey = keyPair.publicKey;
    const targetNamespace =
      await IdentityKey.calculateNamespace(ownerPublicKey);
    const functionIdentity = await IdentityKey.generate();
    const functionIdentityExport = await functionIdentity.export();
    const payload = {
      name: inputName,
      endpoint: inputEndpoint,
      method: inputMethod,
      type: "function",
      code: finalCode,
      metadata: {
        namespace: targetNamespace,
      },
      kvPermission: {
        enabled: true,
        functionIdentity: functionIdentityExport,
      },
    };
    if (node) {
      const owner = await IdentityKey.import(keyPair);
      const ownerPayload = JSON.stringify(payload);
      const ownerSigBuf = await owner.sign(ownerPayload);
      const ownerSignature = bufferToBase64(ownerSigBuf);
      const signedValueByOwner = {
        payload: ownerPayload,
        ownerSignature: ownerSignature,
      };
      await node.storeWithSignature(
        payload.endpoint,
        signedValueByOwner,
        ownerPublicKey,
      );
    }
    const options = {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    };

    try {
      const response = await fetch(url, options);
      const data: {
        error: boolean;
        data: {
          name: string;
          endpoint: string;
          method: string;
          code: string;
          type: string;
          metadata: {
            namespace: string;
          };
        };
        message: string;
      } = await response.json();
      if (!data.error) {
        setFunctions([...functions, data.data]);
        toggle.current?.click();
        setAlertMsg("Fonksiyon başarıyla oluşturuldu.");
        setTimeout(() => {
          setAlertMsg("");
        }, 3000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <input
        ref={toggle}
        type="checkbox"
        id={`new_func_modal`}
        className="modal-toggle"
      />

      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-6xl p-0 overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold">Yeni Fonksiyon</h3>
            </div>

            <label
              htmlFor={`new_func_modal`}
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
                <span className="text-sm font-medium text-base-content/70">
                  index.js
                </span>
                <span className="badge badge-sm badge-neutral">javascript</span>
              </div>

              <div className="flex-1 min-h-[480px] max-h-[600px] overflow-auto custom-scrollbar">
                <CodeEditor
                  value={inputCode}
                  language="js"
                  placeholder="Lütfen JavaScript kodunuzu buraya yazın..."
                  onChange={(evn) => setCode(evn.target.value)}
                  padding={20}
                  style={{
                    fontSize: 14,
                    fontFamily:
                      "ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace",
                    // backgroundColor: "base-300", /* daisyUI temasına uyması için */
                    minHeight: "100%",
                  }}
                  data-color-mode="dark" // Eğer siten koyu temalıysa 'dark', açıksa 'light' yapabilirsin.
                />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="modal-action border-t border-base-300 px-6 py-4 mt-0 bg-base-200/20">
            <label htmlFor={`new_func_modal`} className="btn btn-ghost">
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
