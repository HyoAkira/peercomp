import type { EntityTable } from "dexie";
import Dexie from "dexie";

interface IFunction {
  id: string;
  data: JSON;
}
interface IKv {
  id: string;
  data: JSON;
}
type TFunction = Dexie & { contents: EntityTable<IFunction> };
type TKv = Dexie & { contents: EntityTable<IKv> };
const FunctionDatabase = new Dexie("FunctionDatabase") as TFunction;

FunctionDatabase.version(1).stores({
  contents: "id , data",
});

const KvDatabase = new Dexie("KVDatabase") as TKv;

KvDatabase.version(1).stores({
  contents: "id , data",
});

export { FunctionDatabase, KvDatabase };
