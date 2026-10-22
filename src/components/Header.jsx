import {
  Link,
  NavLink
} from "react-router-dom";

import {
  Home,
  ShieldAlert,
  Landmark,
  Scale,
  Newspaper,
  Info
} from "lucide-react";

import { useT } from "../hooks/useT";

import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const t = useT();

  const navigation = [
    {
      to: "/",
      label: t("home"),
      icon: Home,
      end: true
    },
    {
      to: "/emergency",
      label: t("emergency"),
      icon: ShieldAlert
    },
    {
      to: "/embassy",
      label: t("embassy"),
      icon: Landmark
    },
    {
      to: "/rights",
      label: t("rights"),
      icon: Scale
    },
    {
      to: "/news",
      label: t("news"),
      icon: Newspaper
    },
    {
      to: "/about",
      label: t("about"),
      icon: Info
    }
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          to="/"
          className="brand"
          aria-label={t("home")}
        >
          <span className="brand-icon">
            <img src="/logo.png" width="42" height="42" alt="" aria-hidden="true" />
          </span>

          <span className="brand-text">
            <strong lang={t.lang}>{t("brand")}</strong>
            <small lang={t.lang === "bn" ? "en" : "bn"}>
              {t.lang === "bn" ? "Protect Probashi" : "প্রটেক্ট প্রবাসী"}
            </small>
          </span>
        </Link>

        <nav
          className="desktop-nav"
          aria-label={t("navigation")}
        >
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `desktop-nav__link ${
                    isActive ? "is-active" : ""
                  }`
                }
              >
                <Icon
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <LanguageSwitcher />
      </div>
    </header>
  );
}