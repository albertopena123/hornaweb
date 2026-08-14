import Link from "next/link";
import { Icon, type IconName } from "@/components/admin/Icon";
import { formatRelative } from "@/lib/ui/dates";
import "./dashboard.css";
import type { DashboardData } from "./types";

function Kpi({
  icon,
  tone,
  value,
  label,
  sub,
}: {
  icon: IconName;
  tone: string;
  value: number | string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="kpi">
      <span className={`kpi__icon kpi__icon--${tone}`}>
        <Icon name={icon} size={22} />
      </span>
      <div className="kpi__body">
        <div className="kpi__val">{value}</div>
        <div className="kpi__label">{label}</div>
        {sub && <div className="kpi__sub">{sub}</div>}
      </div>
    </div>
  );
}

export function DashboardView({
  data,
  nowMs,
}: {
  data: DashboardData;
  nowMs: number;
}) {
  const { users, roles, supporters, activity, quickActions } = data;
  const now = nowMs;

  const maxRole = Math.max(1, ...(roles?.distribution.map((r) => r.count) ?? [1]));
  const maxDistrict = Math.max(
    1,
    ...(supporters?.byDistrict.map((d) => d.count) ?? [1]),
  );

  return (
    <div className="page dash">
      <header className="dash__greet">
        <h1>
          {data.greeting}, {data.firstName}
        </h1>
        <p className="dash__date">{data.dateLabel}</p>
      </header>

      {/* KPIs */}
      <section className="kpi-grid">
        {users && (
          <Kpi
            icon="users"
            tone="blue"
            value={users.total}
            label="Usuarios"
            sub={`${users.active} activos · ${users.suspended} suspendidos`}
          />
        )}
        {roles && (
          <Kpi
            icon="shield"
            tone="violet"
            value={roles.total}
            label="Roles"
            sub="Configurados en el sistema"
          />
        )}
        {supporters && (
          <Kpi
            icon="heart"
            tone="amber"
            value={supporters.pending}
            label="Apoyos pendientes"
            sub={`${supporters.total} registrados en total`}
          />
        )}
        {supporters && (
          <Kpi
            icon="check"
            tone="green"
            value={supporters.approved}
            label="Apoyos aprobados"
            sub={`${supporters.rejected} rechazados`}
          />
        )}
      </section>

      <div className="dash__cols">
        <div className="dash__main">
          {/* Simpatizantes por distrito */}
          {supporters && (
            <section className="panel">
              <div className="panel__hd">
                <h2>Simpatizantes por distrito</h2>
                <Link className="linkbtn" href="/simpatizantes">
                  Ver todos
                  <Icon name="chevron-right" size={16} />
                </Link>
              </div>

              {supporters.total === 0 ? (
                <div className="panel__empty">
                  <span className="panel__empty-icon">
                    <Icon name="inbox" size={24} />
                  </span>
                  <p>Aún no hay simpatizantes registrados.</p>
                </div>
              ) : (
                <div className="sevbars">
                  {supporters.byDistrict.map((d) => (
                    <div className="sevrow" key={d.key}>
                      <span className="sevrow__label" title={d.label}>
                        {d.label}
                      </span>
                      <span className="sevtrack">
                        <span
                          className="sevtrack__fill"
                          style={{
                            width: `${(d.count / maxDistrict) * 100}%`,
                            background: "var(--accent)",
                          }}
                        />
                      </span>
                      <span className="sevrow__count">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Roles distribution */}
          {roles && roles.distribution.length > 0 && (
            <section className="panel">
              <div className="panel__hd">
                <h2>Usuarios por rol</h2>
                <Link className="linkbtn" href="/roles">
                  Gestionar
                  <Icon name="chevron-right" size={16} />
                </Link>
              </div>
              <div className="sevbars">
                {roles.distribution.map((r) => (
                  <div className="sevrow" key={r.name}>
                    <span className="sevrow__label" title={r.name}>
                      {r.name}
                    </span>
                    <span className="sevtrack">
                      <span
                        className="sevtrack__fill"
                        style={{
                          width: `${(r.count / maxRole) * 100}%`,
                          background: r.system
                            ? "var(--accent)"
                            : "var(--sev-low)",
                        }}
                      />
                    </span>
                    <span className="sevrow__count">{r.count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="dash__side">
          {/* Quick actions */}
          {quickActions.length > 0 && (
            <section className="panel">
              <div className="panel__hd">
                <h2>Accesos rápidos</h2>
              </div>
              <div className="qa-list">
                {quickActions.map((qa) => (
                  <Link key={qa.href + qa.label} className="qa" href={qa.href}>
                    <span className="qa__icon">
                      <Icon name={qa.icon} size={20} />
                    </span>
                    <span className="qa__text">
                      <span className="qa__label">{qa.label}</span>
                      <span className="qa__desc">{qa.desc}</span>
                    </span>
                    <Icon name="chevron-right" size={18} className="qa__chev" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Activity feed */}
          <section className="panel">
            <div className="panel__hd">
              <h2>Actividad reciente</h2>
            </div>
            {activity.length === 0 ? (
              <div className="panel__empty">
                <p>Sin actividad reciente.</p>
              </div>
            ) : (
              <ul className="feed">
                {activity.map((a) => (
                  <li key={a.id} className="feed__item">
                    <span className={`feed__icon feed__icon--${a.tone}`}>
                      <Icon name={a.icon} size={16} />
                    </span>
                    <span className="feed__text">
                      <span className="feed__title">{a.title}</span>
                      <span className="feed__sub">{a.sub}</span>
                    </span>
                    <time className="feed__time">{formatRelative(a.at, now)}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
