import { api } from "@peercomp/config";
import { useEffect } from "react";
import { bufferToBase64, IdentityKey } from "@peercomp/encryption/utils";
import { useIdentityKey, useKv, useToken } from "~/lib/store";
import DeleteStorageModalComponent from "./components/deleteStorageModal";
import EditStorageModalComponent from "./components/editStorageModal";
import icons from "./components/icons";
import NewStorageModal from "./components/newStorageModal";

export default function StoragePage() {
  const kv = useKv((state) => state.kv);
  const setKv = useKv((state) => state.setKv);
  const token = useToken((state) => state.token);
  const keyPair = useIdentityKey((state) => state.keyPair);
  useEffect(() => {
    (async () => {
      if (!token) return;
      const url = `${api.baseURL}${api.apiURL}kv/author/me`;
      const options = {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!data.error) setKv(data.data);
        // encryption baslangic
        if (keyPair && data.data) {
          const owner = await IdentityKey.import(keyPair);
          const ownerSigBuf = await owner.sign(JSON.stringify(data.data));
          const signedValueByOwner = {
            payload: data.data,
            ownerSignature: bufferToBase64(ownerSigBuf),
          };
        }
      } catch (error) {
        console.error("Error fetching KV data:", error);
      }
    })();
  }, [token]);

  return (
    <main className="flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">K&V Veritabanı</h1>
        </div>

        <label htmlFor="storage_modal" className="btn btn-primary">
          Yeni Kayıt
        </label>
        <NewStorageModal />
      </div>

      {/* TABLE */}
      <div className="list rounded-box shadow-md">
        {kv.map((item) => (
          <StorageItem
            key={item._id}
            id={item._id}
            variableKey={item.key}
            value={item.value}
            isEncrypted={item.isEncrypted}
            iv={item.iv}
            metadata={item.metadata}
            author={item.author}
          />
        ))}
      </div>
    </main>
  );
}

function StorageItem({
  id,
  variableKey,
  value,
  isEncrypted,
  iv,
  metadata,
  author,
}: {
  id: string;
  variableKey: string;
  value: string;
  isEncrypted: boolean;
  iv: string;
  metadata: any;
  author: string;
}) {
  return (
    <li className="list-row items-center">
      {/* ID */}
      <div className="text-xs font-mono opacity-50">{id}</div>

      {/* KEY */}
      <div className="list-col-grow">
        <div className="font-medium font-mono">{variableKey}</div>

        <div className="text-xs opacity-60 truncate max-w-[600px]">{value}</div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-1">
        {/* EDIT */}
        <div className="tooltip tooltip-top" data-tip="Düzenle">
          <label
            htmlFor={`storage_modal_${id}`}
            className="btn btn-square btn-ghost"
          >
            {icons.edit}
          </label>
        </div>

        {/* DELETE */}
        <div className="tooltip tooltip-top" data-tip="Sil">
          <label
            htmlFor={`delete_modal_${id}`}
            className="btn btn-square btn-ghost text-error"
          >
            {icons.trash}
          </label>
          <DeleteStorageModalComponent kvId={id} />
          <EditStorageModalComponent
            kvId={id}
            author={author}
            isEncrypted={isEncrypted}
            iv={iv}
            variableKey={variableKey}
            metadata={metadata}
            value={value}
          />
        </div>
      </div>
    </li>
  );
}
