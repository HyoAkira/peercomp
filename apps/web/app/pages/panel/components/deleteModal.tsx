import { api } from "@peercomp/config";
import { useFunctions, usePeerNode, useToken } from "~/lib/store";

type FunctionMethod = "GET" | "POST";

export default function DeleteModalComponent({
  functionId,
}: Readonly<{ functionId: string }>) {
  const node = usePeerNode((state) => state.peerNode);
  const token = useToken((state) => state.token);
  const setFunctions = useFunctions((state) => state.setFunctions);
  async function handleDelete() {
    const url = `${api.baseURL}${api.apiURL}functions/${functionId}`;
    const options = {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!data.error) {
        setFunctions(useFunctions.getState().functions.filter((func) => func._id !== functionId));
        if (node) {
          const payload = data.data;

          const keyToHash = payload.method
            ? `${payload.metadata.namespace}:${payload.type}:${payload.method}:${payload.endpoint}`
            : `${payload.metadata.namespace}:${payload.type}:${payload.key}`;
          await node.delete(keyToHash); // Peer'ten de sil
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <input
        type="checkbox"
        id={`delete_modal_${functionId}`}
        className="modal-toggle"
      />

      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-6xl p-0">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold">Fonksiyon Sil</h3>
            </div>

            <label
              htmlFor={`delete_modal_${functionId}`}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </label>
          </div>

          {/* CONTENT */}
          <div className="flex flex-col gap-5 p-6">
            <p>Bu fonksiyonu silmek istediğinize emin misiniz?</p>
            <button className="btn btn-error" onClick={handleDelete}>
              Evet, Sil
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
