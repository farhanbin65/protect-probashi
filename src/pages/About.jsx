import {
  Info,
  ShieldCheck,
  LockKeyhole,
  Mail,
  AlertCircle
} from "lucide-react";

import { useT } from "../hooks/useT";

export default function About() {
  const t = useT();

  return (
    <div className="page">
      <div className="page-heading">
        <Info size={30} aria-hidden="true" />

        <h1>{t("about")}</h1>
      </div>

      <section className="panel section-spacing">
        <div className="item-heading">
          <ShieldCheck
            size={26}
            aria-hidden="true"
          />

          <h2>{t("mission")}</h2>
        </div>

        <p>{t("missionText")}</p>
      </section>

      <section className="panel section-spacing">
        <div className="item-heading">
          <AlertCircle
            size={26}
            aria-hidden="true"
          />

          <h2>{t("limitations")}</h2>
        </div>

        <p>{t("limitationsText")}</p>
      </section>

      <section className="panel section-spacing">
        <div className="item-heading">
          <LockKeyhole
            size={26}
            aria-hidden="true"
          />

          <h2>{t("privacy")}</h2>
        </div>

        <p>{t("privacyText")}</p>
      </section>

      <section className="panel section-spacing">
        <div className="item-heading">
          <Mail size={26} aria-hidden="true" />

          <h2>{t("report")}</h2>
        </div>

        <p>{t("reportText")}</p>

        <p className="muted">
          {t("reportUnavailable")}
        </p>
      </section>
    </div>
  );
}