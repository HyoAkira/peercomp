import { api } from "@peercomp/config";
import { useState } from "react";
import { useFunctions, useKv, useToken } from "~/lib/store";

type FunctionMethod = "GET" | "POST";

export default function DeleteStorageModalComponent({
  kvId,
}: Readonly<{ kvId: string }>) {
  const token = useToken((state) => state.token);
  const setKv = useKv((state) => state.setKv);
  const kv = useKv((state) => state.kv);
  async function handleDelete() {
    const url = `${api.baseURL}${api.apiURL}kv/${kvId}`;
    const options = {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!data.error)
        setKv(kv.filter((item) => item._id !== kvId));
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <>
      <input
        type="checkbox"
        id={`delete_modal_${kvId}`}
        className="modal-toggle"
      />

      <div className="modal" role="dialog">
        <div className="modal-box w-11/12 max-w-6xl p-0">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-base-300 px-6 py-4">
            <div>
              <h3 className="text-lg font-bold">K&V Sil</h3>
            </div>

            <label
              htmlFor={`delete_modal_${kvId}`}
              className="btn btn-sm btn-circle btn-ghost"
            >
              ✕
            </label>
          </div>

          {/* CONTENT */}
          <div className="flex flex-col gap-5 p-6">
            <p>Bu K&V kaydını silmek istediğinize emin misiniz?</p>
            <button className="btn btn-error" onClick={handleDelete}>
              Evet, Sil
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
