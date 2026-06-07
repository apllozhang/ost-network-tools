import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const links = [
    { href: "/", label: t("nav.dashboard") },
    { href: "/connect", label: t("nav.connect") },
    { href: "/poe", label: t("nav.poe") },
    { href: "/tdr", label: t("nav.tdr") },
    { href: "/vlan", label: t("nav.vlan") },
    { href: "/snmp", label: t("nav.snmp") },
    { href: "/traffic", label: t("nav.traffic") },
    { href: "/log", label: t("nav.log") },
    { href: "/firmware", label: t("nav.firmware") },
    { href: "/search", label: t("nav.search") },
  ];

  return (
    <nav className="border-b p-4 flex gap-4 items-center">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={location === link.href ? "font-bold" : ""}
        >
          {link.label}
        </Link>
      ))}
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
  );
}
