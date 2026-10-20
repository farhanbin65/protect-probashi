import { NavLink } from "react-router-dom";
import { Home, Landmark, ShieldAlert, Scale, Newspaper } from "lucide-react";
import { useT } from "../hooks/useT";

export default function MobileNav() {
  const t = useT();
  const links = [
    ["/", "home", Home], ["/embassy", "embassy", Landmark],
    ["/emergency", "emergency", ShieldAlert], ["/rights", "rights", Scale],
    ["/news", "news", Newspaper]
  ];
  return <nav className="mobile-nav" aria-label={t("navigation")}>
    {links.map(([to, key, Icon]) => <NavLink key={to} to={to} end={to === "/"}
      className={({ isActive }) => `mobile-nav__item ${isActive ? "is-active" : ""}`}>
      <Icon size={22} aria-hidden="true" /><span>{t(key)}</span>
    </NavLink>)}
  </nav>;
}
