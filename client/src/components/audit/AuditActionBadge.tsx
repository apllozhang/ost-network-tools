import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

const ACTION_STYLES: Record<string, string> = {
  login: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  logout: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  create: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  update: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  acknowledge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  close: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  silence: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  collect: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export function AuditActionBadge({ action }: { action: string }) {
  const { t } = useTranslation();
  const style = ACTION_STYLES[action] ?? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <Badge variant="outline" className={`border-0 ${style}`}>
      {t(`audit.${action}`, action)}
    </Badge>
  );
}
