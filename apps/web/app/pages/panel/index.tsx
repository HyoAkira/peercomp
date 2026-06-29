import { Link } from "react-router";
import DbToLocalComponent from "~/components/dbToLocal";
import { useFunctions, useKv } from "~/lib/store";
import icons from "./components/icons";

export default function PanelPage() {
  const functions = useFunctions((state) => state.functions);
  const kv = useKv((state) => state.kv);

  return (
    <main className="flex flex-col gap-6">
      <DbToLocalComponent />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-md">
          <div className="card-body flex-row items-center gap-4">
            <div className="text-primary">{icons.functions}</div>
            <div>
              <div className="text-3xl font-bold">{functions.length}</div>
              <div className="text-sm opacity-60">Fonksiyon</div>
            </div>
          </div>
        </div>
        <div className="card bg-base-100 shadow-md">
          <div className="card-body flex-row items-center gap-4">
            <div className="text-primary">{icons.kv}</div>
            <div>
              <div className="text-3xl font-bold">{kv.length}</div>
              <div className="text-sm opacity-60">KV Kaydı</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Functions */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-3">
            <div className="flex justify-between items-center">
              <h2 className="card-title text-base">Son Fonksiyonlar</h2>
              <Link to="/panel/functions" className="text-xs text-primary">
                Tümünü Gör
              </Link>
            </div>
            <div className="list rounded-box">
              {functions.length === 0 && (
                <li className="list-row text-sm opacity-50">Henüz fonksiyon yok.</li>
              )}
              {functions.slice(-5).reverse().map((fn) => (
                <li key={fn._id} className="list-row items-center">
                  <div className="font-medium text-sm">{fn.name}</div>
                  <div className="list-col-grow" />
                  <span className="badge badge-ghost badge-sm uppercase">{fn.method}</span>
                </li>
              ))}
            </div>
          </div>
        </div>

        {/* KV */}
        <div className="card bg-base-100 shadow-md">
          <div className="card-body gap-3">
            <div className="flex justify-between items-center">
              <h2 className="card-title text-base">Son KV Kayıtları</h2>
              <Link to="/panel/kv" className="text-xs text-primary">
                Tümünü Gör
              </Link>
            </div>
            <div className="list rounded-box">
              {kv.length === 0 && (
                <li className="list-row text-sm opacity-50">Henüz kayıt yok.</li>
              )}
              {kv.slice(-5).reverse().map((item) => (
                <li key={item._id} className="list-row items-center">
                  <div className="font-mono text-sm">{item.key}</div>
                  <div className="list-col-grow" />
                  <div className="text-xs opacity-50 font-mono truncate max-w-[120px]">{item.value}</div>
                </li>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
