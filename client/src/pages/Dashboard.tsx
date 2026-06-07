import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { t } = useTranslation();
  const info = trpc.switch.getInfo.useQuery({});

  if (!info.data?.connected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">{t("dashboard.notConnected")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <h3 className="text-sm text-gray-500">{t("dashboard.switchName")}</h3>
          <p className="text-lg font-semibold">
            {info.data.switch?.name ?? "—"}
          </p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="text-sm text-gray-500">{t("dashboard.version")}</h3>
          <p className="text-lg font-semibold">
            {info.data.switch?.version ?? "—"}
          </p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="text-sm text-gray-500">{t("dashboard.upTime")}</h3>
          <p className="text-lg font-semibold">
            {info.data.switch?.upTime ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
