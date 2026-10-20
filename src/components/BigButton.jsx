import { Link } from "react-router-dom";

export default function BigButton({
  icon: Icon,
  label,
  to,
  href,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  ...props
}) {
  const classes = [
    "big-button",
    `big-button--${variant}`,
    className
  ].join(" ");

  const content = (
    <>
      {Icon && (
        <Icon
          size={25}
          strokeWidth={2}
          aria-hidden="true"
        />
      )}

      <span>{label}</span>
    </>
  );

  if (disabled) {
    return (
      <button
        type="button"
        className={classes}
        disabled
        {...props}
      >
        {content}
      </button>
    );
  }

  if (to) {
    return (
      <Link
        to={to}
        className={classes}
        {...props}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
}