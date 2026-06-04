import DbToLocalComponent from "~/components/dbToLocal";
import { useFunctions } from "~/lib/store";
import DeleteModalComponent from "./components/deleteModal";
import EditModalComponent from "./components/editModal";
import icons from "./components/icons";
import NewFuncModal from "./components/newFuncModal";

export default function FunctionsPage() {
  const functions = useFunctions((state) => state.functions);

  return (
    <main className="flex flex-col">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold mb-4">Fonksiyonlar</h1>
        <div>
          <label htmlFor={`new_func_modal`} className="btn btn-primary">
            Yeni Fonksiyon Ekle
          </label>
          <NewFuncModal />
        </div>
      </div>
      <div className="list rounded-box shadow-md">
        {functions.map((func) => (
          <FunctionItem
            key={func._id}
            name={func.name}
            method={func.method}
            functionId={func._id}
            endpoint={func.endpoint}
            code={func.code}
          />
        ))}
      </div>
      <DbToLocalComponent />
    </main>
  );
}

function FunctionItem({
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
  return (
    <li className="list-row items-center">
      {/* LEFT CONTENT */}
      <div>
        <div>{name}</div>
        <div className="text-xs uppercase font-semibold opacity-60">
          {method}
        </div>
      </div>

      {/* SPACER (IMPORTANT) */}
      <div className="list-col-grow"></div>

      {/* ACTIONS */}
      <div className="flex gap-2">
        {/* <button className="btn btn-square btn-ghost">{icons.play}</button> */}

        <div className="tooltip tooltip-top relative z-50" data-tip="Düzenle">
          <label
            htmlFor={`edit_modal_${functionId}`}
            className="btn btn-square btn-ghost"
          >
            {icons.edit}
          </label>
        </div>

        <div className="tooltip tooltip-top relative z-50" data-tip="Sil">
          <label
            htmlFor={`delete_modal_${functionId}`}
            className="btn btn-square btn-ghost"
          >
            {icons.trash}
          </label>
        </div>

        <EditModalComponent
          endpoint={endpoint}
          method={method}
          name={name}
          functionId={functionId}
          code={code}
        />
        <DeleteModalComponent functionId={functionId} />
      </div>
    </li>
  );
}
