import { WifiOff } from "lucide-react";

import { useOnline } from "../hooks/useOnline";
import { useT } from "../hooks/useT";

export default function OfflineBanner() {
  const online = useOnline();
  const t = useT();

  if (online) return null;

  return (
    <div
      className="offline-banner"
      role="status"
    >
      <WifiOff size={20} aria-hidden="true" />

      <span>{t("offlineBanner")}</span>
    </div>
  );
}