import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

export default function DeviceManager() {
  const { t } = useTranslation();
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const connect = trpc.switch.connect.useMutation();

  const handleConnect = () => {
    connect.mutate({ ip, username, password });
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">{t("connect.title")}</h1>
      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("connect.ip")}</label>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="192.168.1.1"
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("connect.username")}</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">{t("connect.password")}</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <button
        onClick={handleConnect}
        disabled={connect.isPending || !ip.trim()}
        className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {connect.isPending ? t("connect.connecting") : t("connect.submit")}
      </button>
      {connect.isError && (
        <p className="text-red-600">{connect.error.message}</p>
      )}
      {connect.data && (
        <div className="p-4 bg-white dark:bg-muted border border-green-400 rounded text-green-800 dark:text-green-300 font-medium">
          <p>{t("connect.success", { name: connect.data.switch?.name })}</p>
        </div>
      )}
    </div>
  );
}
