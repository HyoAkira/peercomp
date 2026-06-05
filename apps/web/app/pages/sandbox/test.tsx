import { usePeerNode } from "~/lib/store";

export default function TestPage() {
  const node = usePeerNode((state) => state.peerNode);

  function jsonClean(obj) {
    if (obj === null || obj === undefined) return obj;
    return JSON.stringify(JSON.parse(obj));
  }
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const kvKey = formData.get("kvKey") as string;
    const kvValue = formData.get("kvValue") as string;
    const kvJson = JSON.parse(jsonClean(kvValue));
    kvJson.type = "kv";

   await node.store(kvKey, kvJson);
  }
  async function handleGet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const kvKey = formData.get("kvKey") as string;
    const result = await node.findValue(`kv:${kvKey}`);
    console.log(result);
  }

  return (
    <div className="flex flex-row">
      <div className="flex-1 h-screen flex justify-around bg-amber-400">
        <form
          onSubmit={handleSave}
          className=" flex flex-col gap-2 justify-center items-start p-4"
        >
          <label>
            KV Key:
            <input className="input" type="text" name="kvKey" />
          </label>
          <label>
            KV Value:
            <textarea className="textarea h-100" name="kvValue" />
          </label>
          <button className="btn" type="submit">
            Save
          </button>
        </form>
        <form
          onSubmit={handleGet}
          className="flex flex-col gap-2 justify-center items-start p-4"
        >
          <label>
            KV Key:
            <input className="input" type="text" name="kvKey" />
          </label>
          <div className="bg-amber-100 h-100 w-100"></div>
          <button className="btn" type="submit">
            Get
          </button>
        </form>
      </div>
    </div>
  );
}
