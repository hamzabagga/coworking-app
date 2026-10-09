import { api, getErrorMessage } from "@/api/client";
import type { Reservation, Space, User } from "@/api/types";
import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { useAuth } from "@/context/AuthContext";
import { BoxCubeIcon, CalenderIcon, GroupIcon } from "@/icons";
import { formatDateTime } from "@/utils/format";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";

interface Stats {
  spaces: number;
  upcoming: Reservation[];
  members?: number;
}

export default function Home() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // réservations confirmées qui ne sont pas encore terminées
    // (un membre ne reçoit que les siennes, l'admin reçoit tout)
    const params = { status: "confirmed", from: new Date().toISOString() };

    Promise.all([
      api.get<Space[]>("/spaces"),
      api.get<Reservation[]>("/reservations", { params }),
      isAdmin ? api.get<User[]>("/users") : Promise.resolve(null),
    ])
      .then(([spaces, reservations, users]) => {
        const upcoming = [...reservations.data].sort((a, b) =>
          a.startTime.localeCompare(b.startTime),
        );
        setStats({
          spaces: spaces.data.length,
          upcoming,
          members: users?.data.filter((u) => u.role === "member").length,
        });
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [isAdmin]);

  return (
    <>
      <PageMeta
        title="Dashboard | Coworking"
        description="Vue d'ensemble du coworking"
      />
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Bonjour {user?.firstName} 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isAdmin
            ? "Vue d'ensemble de l'activité du coworking."
            : "Vue d'ensemble de vos réservations."}
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error" title="Erreur" message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-3">
        <MetricCard
          icon={
            <BoxCubeIcon className="size-6 text-gray-800 dark:text-white/90" />
          }
          label="Espaces disponibles"
          value={stats?.spaces}
          link="/spaces"
        />
        <MetricCard
          icon={
            <CalenderIcon className="size-6 text-gray-800 dark:text-white/90" />
          }
          label={isAdmin ? "Réservations à venir" : "Mes réservations à venir"}
          value={stats?.upcoming.length}
          link="/reservations"
        />
        {isAdmin && (
          <MetricCard
            icon={
              <GroupIcon className="size-6 text-gray-800 dark:text-white/90" />
            }
            label="Membres"
            value={stats?.members}
            link="/members"
          />
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 md:p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Prochaines réservations
        </h3>
        {stats && stats.upcoming.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Aucune réservation à venir.{" "}
            <Link
              to="/reservations"
              className="text-brand-500 hover:text-brand-600"
            >
              Réserver un espace
            </Link>
          </p>
        )}
        <ul className="divide-y divide-gray-100 dark:divide-white/5">
          {stats?.upcoming.slice(0, 5).map((r) => (
            <li
              key={r._id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {r.space?.name ?? "Espace supprimé"}
                </p>
                {isAdmin && r.user && (
                  <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                    {r.user.firstName} {r.user.lastName}
                  </p>
                )}
              </div>
              <span className="text-theme-sm text-gray-500 dark:text-gray-400">
                {formatDateTime(r.startTime)} → {formatDateTime(r.endTime)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  link,
}: {
  icon: ReactNode;
  label: string;
  value?: number;
  link: string;
}) {
  return (
    <Link
      to={link}
      className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 md:p-6 dark:border-gray-800 dark:bg-white/3 dark:hover:border-brand-800"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <h4 className="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
          {value ?? "…"}
        </h4>
      </div>
    </Link>
  );
}
