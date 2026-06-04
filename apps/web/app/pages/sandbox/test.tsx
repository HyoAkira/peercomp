import { useState, type FormEvent } from "react";
import { usePeerNode } from "~/lib/store";

export default function TestPage() {
  const [saveKey, setSaveKey] = useState("");
  const [saveValue, setSaveValue] = useState("");
  const [searchKey, setSearchKey] = useState("");

  const canSave = saveKey.trim().length > 0;
  const canSearch = searchKey.trim().length > 0;
  const node = usePeerNode((state) => state.peerNode);
  async function handleSaveSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // kaydetme işlemini sen kodlayacaksın
    if (node) {
      await node.store(saveKey, JSON.parse(saveValue));
      alert("Veri kaydedildi!");
    }
  }

  async function handleCall(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // fonksiyon çağrısı işlemini sen kodlayacaksın
    if (node) {
      const result = await node.function_call(searchKey);
      alert(`Fonksiyon sonucu: ${JSON.stringify(result)}`);
    }
  }

  async function handleSearchSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // arama işlemini sen kodlayacaksın
    const val = await node.findValue(searchKey);
    alert(`Arama sonucu: ${JSON.stringify(val)}`);
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-4xl flex flex-col gap-6">
        <h1 className="text-xl font-bold">Sandbox</h1>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KAYDET */}
          <form onSubmit={handleSaveSubmit} className="w-full">
            <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
              <legend className="fieldset-legend">K&V Kaydet</legend>

              <label className="label">Key</label>
              <input
                type="text"
                className="input input-bordered font-mono"
                placeholder="user:1:profile"
                value={saveKey}
                onChange={(e) => setSaveKey(e.target.value)}
                required
              />

              <label className="label">Value</label>
              <textarea
                className="textarea textarea-bordered min-h-28 font-mono"
                placeholder='{"name":"Ada"}'
                value={saveValue}
                onChange={(e) => setSaveValue(e.target.value)}
              />

              <button
                type="submit"
                className="btn btn-primary mt-2"
                disabled={!canSave}
              >
                Kaydet
              </button>
            </fieldset>
          </form>

          {/* ARA */}
          <form onSubmit={handleSearchSubmit} className="w-full">
            <fieldset className="fieldset bg-base-200 border-base-300 rounded-box border p-4">
              <legend className="fieldset-legend">Key ile Ara</legend>

              <label className="label">Key</label>
              <input
                type="text"
                className="input input-bordered font-mono"
                placeholder="user:1:profile"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                required
              />

              <button
                type="submit"
                className="btn btn-neutral mt-2"
                disabled={!canSearch}
              >
                Ara
              </button>
            </fieldset>
          </form>
        </section>
      </div>
    </main>
  );
}
