import { api } from "@peercomp/config";
import React, { useEffect } from "react";
import { decryptKvValue, IdentityKey, unwrapOwnDataKey, wrapKeyForDelegation } from "@peercomp/encryption/utils";
import { useIdentityKey, useKv, usePeerNode, useToken } from "~/lib/store";
import DeleteStorageModalComponent from "./components/deleteStorageModal";
import EditStorageModalComponent from "./components/editStorageModal";
import icons from "./components/icons";
import NewStorageModal from "./components/newStorageModal";

export default function StoragePage() {
  const kv = useKv((state) => state.kv);
  const setKv = useKv((state) => state.setKv);
  const token = useToken((state) => state.token);
  const keyPair = useIdentityKey((state) => state.keyPair);
  const ecdhKeyPair = useIdentityKey((state) => state.ecdhKeyPair);
  const node = usePeerNode((state) => state.peerNode);

  // onDelegationKeyRequest — sahip tarayıcısında çalışır, isteyen node'a delegation key verir
  useEffect(() => {
    if (!node || !keyPair || !ecdhKeyPair) return;
    node.onDelegationKeyRequest = async (kvKey, requesterECDHPublicKey) => {
      // Şifreli KV kaydını bul (store'dan)
      const entry = kv.find((item) => item.key === kvKey);
      if (!entry || !entry.isEncrypted || !entry.metadata?.encryptedKey) return null;
      try {
        const dataKey = await unwrapOwnDataKey(
          entry.metadata.encryptedKey,
          entry.metadata.keyIv,
          ecdhKeyPair.privateKey,
        );
        const owner = await IdentityKey.import(keyPair);
        return wrapKeyForDelegation(dataKey, requesterECDHPublicKey, owner, 10_000);
      } catch {
        return null;
      }
    };
  }, [node, keyPair, ecdhKeyPair, kv]);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const url = `${api.baseURL}${api.apiURL}kv/author/me`;
      try {
        const response = await fetch(url, { method: "GET", headers: { authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!data.error) setKv(data.data);
      } catch (error) {
        console.error("Error fetching KV data:", error);
      }
    })();
  }, [token]);

  return (
    <main className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">K&V Veritabanı</h1>
        </div>
        <label htmlFor="storage_modal" className="btn btn-primary">
          Yeni Kayıt
        </label>
        <NewStorageModal />
      </div>

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
            onDecrypt={async () => {
              if (!ecdhKeyPair || !item.isEncrypted || !item.metadata?.encryptedKey) return null;
              try {
                const dataKey = await unwrapOwnDataKey(
                  item.metadata.encryptedKey,
                  item.metadata.keyIv,
                  ecdhKeyPair.privateKey,
                );
                return decryptKvValue(item.value, item.iv, dataKey);
              } catch (e) {
                console.error("Decrypt failed:", e);
                return null;
              }
            }}
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
  onDecrypt,
}: {
  id: string;
  variableKey: string;
  value: string;
  isEncrypted: boolean;
  iv: string;
  metadata: any;
  author: string;
  onDecrypt?: () => Promise<string | null>;
}) {
  const [decryptedValue, setDecryptedValue] = React.useState<string | null>(null);
  const [decrypting, setDecrypting] = React.useState(false);

  async function handleDecrypt() {
    if (!onDecrypt) return;
    setDecrypting(true);
    const result = await onDecrypt();
    setDecryptedValue(result ?? "❌ Çözülemedi");
    setDecrypting(false);
  }

  return (
    <li className="list-row items-center">
      <div className="text-xs font-mono opacity-50">{id}</div>

      <div className="list-col-grow">
        <div className="font-medium font-mono">{variableKey}</div>
        {isEncrypted && !decryptedValue ? (
          <div className="text-xs opacity-60 font-mono">🔒 [Şifreli]</div>
        ) : (
          <div className="text-xs opacity-60 truncate max-w-[600px] font-mono">
            {decryptedValue ?? value}
          </div>
        )}
      </div>

      <div className="flex gap-1">
        {isEncrypted && (
          <div className="tooltip tooltip-top" data-tip="Şifreyi Çöz">
            <button
              className="btn btn-square btn-ghost"
              onClick={handleDecrypt}
              disabled={decrypting}
            >
              {decrypting ? "⏳" : "🔓"}
            </button>
          </div>
        )}

        <div className="tooltip tooltip-top" data-tip="Düzenle">
          <label htmlFor={`storage_modal_${id}`} className="btn btn-square btn-ghost">
            {icons.edit}
          </label>
        </div>

        <div className="tooltip tooltip-top" data-tip="Sil">
          <label htmlFor={`delete_modal_${id}`} className="btn btn-square btn-ghost text-error">
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
