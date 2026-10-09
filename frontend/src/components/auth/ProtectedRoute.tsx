import { useAuth } from "@/context/AuthContext";
import { Navigate, Outlet } from "react-router";

// sans utilisateur connecté → page de connexion
// adminOnly → un membre est renvoyé vers le dashboard
export default function ProtectedRoute({
  adminOnly = false,
}: {
  adminOnly?: boolean;
}) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Chargement…
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
