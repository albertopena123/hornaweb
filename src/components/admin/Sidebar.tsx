"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { Icon } from "./Icon";
import {
  SIDEBAR_SECTIONS,
  type SidebarItem,
  type NavSection,
} from "./data";

type Props = {
  collapsed: boolean;
  mobileOpen?: boolean;
  user?: {
    name: string;
    email: string;
    roles: string[];
    roleKeys?: string[];
    permissions?: string[];
  };
};

function pathToIds(pathname: string): { top: string; sub: string } {
  const segs = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  return { top: segs[0] ?? "", sub: segs.slice(0, 2).join("/") };
}

export function Sidebar({ collapsed, mobileOpen = false, user }: Props) {
  const pathname = usePathname();
  const { top: activeId, sub: activeSubId } = pathToIds(pathname);

  // Filtrado estrictamente dinámico por roles y permisos del usuario
  const visibleSections = useMemo(() => {
    const isSuperadmin = user?.roleKeys?.includes("superadmin") ?? false;
    const userPerms = new Set(user?.permissions ?? []);

    return SIDEBAR_SECTIONS.map((section) => {
      const allowedItems = section.items
        .map((item) => {
          // Superadmin ve todo
          if (isSuperadmin) return item;

          // Si es un grupo con sub-elementos (ej. Personeros, Mensajería)
          if (item.children && item.children.length > 0) {
            const allowedChildren = item.children.filter((child) => {
              if (!child.permission) return true;
              return userPerms.has(child.permission);
            });

            // Solo mostrar si el usuario tiene al menos un sub-módulo permitido
            if (allowedChildren.length > 0) {
              return {
                ...item,
                children: allowedChildren,
              };
            }
            return null;
          }

          // Ítems simples sin hijos
          if (!item.permission) return item; // ej. Inicio
          if (userPerms.has(item.permission)) return item;

          return null;
        })
        .filter((item): item is SidebarItem => item !== null);

      return {
        ...section,
        items: allowedItems,
      };
    }).filter((section) => section.items.length > 0);
  }, [user]);

  // Lista plana de ítems visibles para determinar el menú abierto
  const flatVisibleItems = useMemo(
    () => visibleSections.flatMap((s) => s.items),
    [visibleSections]
  );

  const parentOfActive =
    flatVisibleItems.find(
      (g) =>
        (g.expandable && g.id === activeId) ||
        g.children?.some((c) => c.id === activeSubId)
    )?.id ?? null;

  const [openId, setOpenId] = useState<string | null>(parentOfActive);
  const [prevParent, setPrevParent] = useState(parentOfActive);
  if (parentOfActive !== prevParent) {
    setPrevParent(parentOfActive);
    if (parentOfActive) setOpenId(parentOfActive);
  }

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${
        mobileOpen ? "sidebar--mobile-open" : ""
      }`}
    >
      <nav className="sidebar__nav">
        {visibleSections.map((section) => (
          <div key={section.id} className="sidebar__section-block">
            {!collapsed && (
              <div className="sidebar__section-title">{section.title}</div>
            )}

            {section.items.map((item) => {
              const isOpen = openId === item.id;
              const isSelf = activeId === item.id;
              const hasActiveChild =
                item.children?.some((c) => c.id === activeSubId) ?? false;

              const itemClass = `sidebar__item ${
                isSelf && !hasActiveChild ? "is-active" : ""
              } ${hasActiveChild ? "is-parent-active" : ""}`;

              const inner = (
                <>
                  <span className="sidebar__icon">
                    <Icon name={item.icon} size={20} />
                    {item.dot && <span className="sidebar__dot" />}
                  </span>
                  <span className="sidebar__label">{item.label}</span>
                  {item.expandable && (
                    <span className="sidebar__chev">
                      <Icon
                        name={isOpen ? "chevron-down" : "chevron-right"}
                        size={16}
                      />
                    </span>
                  )}
                </>
              );

              return (
                <div key={item.id} className="sidebar__group">
                  {item.expandable && !collapsed ? (
                    <button
                      type="button"
                      className={itemClass}
                      onClick={() => setOpenId(isOpen ? null : item.id)}
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link
                      href={item.href ?? item.children?.[0]?.href ?? `/${item.id}`}
                      className={itemClass}
                      title={collapsed ? item.label : undefined}
                    >
                      {inner}
                    </Link>
                  )}

                  {item.children && isOpen && !collapsed && (
                    <div className="sidebar__sub">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.href}
                          className={`sidebar__subitem ${
                            activeSubId === child.id ? "is-active" : ""
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
