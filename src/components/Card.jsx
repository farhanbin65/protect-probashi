import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function Card({
  to,
  icon: Icon,
  title,
  description
}) {
  return (
    <Link to={to} className="feature-card">
      {Icon && (
        <div className="feature-card__icon">
          <Icon
            size={28}
            strokeWidth={2}
            aria-hidden="true"
          />
        </div>
      )}

      <div className="feature-card__body">
        <h2>{title}</h2>

        {description && <p>{description}</p>}
      </div>

      <ChevronRight
        className="direction-icon"
        size={23}
        aria-hidden="true"
      />
    </Link>
  );
}