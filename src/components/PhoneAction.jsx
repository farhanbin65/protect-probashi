import { Phone } from "lucide-react";

import BigButton from "./BigButton";
import { useT } from "../hooks/useT";
import { isValidPhone } from "../utils/content";

export default function PhoneAction({
  number,
  variant = "primary"
}) {
  const t = useT();
  const valid = isValidPhone(number);

  return (
    <div className="phone-action">
      <strong>
        <bdi dir="ltr">
          {number || t("unverified")}
        </bdi>
      </strong>

      <BigButton
        icon={Phone}
        label={valid ? t("call") : t("numberUnavailable")}
        href={valid ? `tel:${number}` : undefined}
        disabled={!valid}
        variant={variant}
      />
    </div>
  );
}