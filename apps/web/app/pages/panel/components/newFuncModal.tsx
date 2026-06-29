import { api } from "@peercomp/config";
import { bufferToBase64, IdentityKey } from "@peercomp/encryption/utils";
import CodeEditor from "@uiw/react-textarea-code-editor"; // <-- Paket eklendi
import { parse } from "acorn";
import escodegen from "escodegen";
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

  // === KV YETKİ ALANI STATE'LERİ ===
  const [kvEnabled, setKvEnabled] = useState(false);
  const [kvPatterns, setKvPatterns] = useState("");
  const [kvHours, setKvHours] = useState("24");

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
    //     let finalCode = `(async () => {
    // ${inputCode}
    // })();`;
    try {
      const ast = parse(`async function __main__(){${inputCode}}`, {
        ecmaVersion: "latest",
      });
      console.log(ast);
      const fn = ast.body[0]; // IIFE
      const block = fn.body.body; // user code statements
      console.log(fn, block);

      const newAst = {
        type: "Program",
        body: block,
      };
      const min = escodegen.generate(newAst, {
        format: {
          compact: true,
        },
      });

      const minifiedResult = await minify(min, {
        compress: false,
        mangle: false,
        format: {
          beautify: false,
        },
        parse: {
          bare_returns: true,
        },
        //   // mangle: false,
        //   // parse: {
        //   //   bare_returns: true, // Return ifadelerinin etrafına süslü parantez eklemeden bırakır
        //   //   ecma: 2020, // ECMAScript sürümü
        //   //   html5_comments: false,
        //   //   shebang: true,
        //   // },
        //   // compress: {
        //   //   dead_code: true,
        //   //   drop_debugger: true,
        //   //   module: true,
        //   // },
        //   // format: {
        //   //   comments: false, // Yorum satırlarını da silsin
        //   // },
      });
      if (minifiedResult && minifiedResult.code) {
        finalCode = minifiedResult.code;
      }
    } catch (error) {
      console.log(error);
      setAlertMsg("Hatalı kod formatı.");
      setTimeout(() => {
        setAlertMsg("");
      }, 3000);
      toggle.current?.click();
      return;
    }

    const ownerPublicKey = keyPair.publicKey;
    const targetNamespace =
      await IdentityKey.calculateNamespace(ownerPublicKey);

    // === KV YETKİ ALANI ===
    let kvPermission = null;
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

      // Bu fonksiyona özel yeni bir IdentityKey üret
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

      kvPermission = {
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
        ownerPublicKey,
      };
    }

    const payload: any = {
      name: inputName,
      endpoint: inputEndpoint,
      method: inputMethod,
      type: "function",
      code: finalCode,
      metadata: {
        namespace: targetNamespace,
      },
    };
    if (kvPermission) {
      payload.kvPermission = kvPermission;
    }

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
        setFunctions([...useFunctions.getState().functions, data.data as any]);
        toggle.current?.click();
        setAlertMsg("Fonksiyon başarıyla oluşturuldu.");
        setTimeout(() => {
          setAlertMsg("");
        }, 3000);
        // Form'u sıfırla
        setKvEnabled(false);
        setKvPatterns("");
        setKvHours("24");
      } else {
        throw  {message: data.message};
      }
    } catch (error) {
      toggle.current.click();
      setAlertMsg(error?.message);
      setTimeout(() => {
        setAlertMsg("");
      }, 3000);
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
                      yazma yetkisini kaybedecektir.
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
                  placeholder="Lütfen JavaScript kodunuzu buraya yazın..."
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
