import { api, getErrorMessage } from "@/api/client";
import type { User } from "@/api/types";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { useState, type FormEvent, type ReactNode } from "react";

type Feedback = { variant: "success" | "error"; message: string } | null;

export default function Profile() {
  const { user, setUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    try {
      const { data } = await api.patch<User>("/users/me", {
        firstName,
        lastName,
        phone,
      });
      setUser(data); // met à jour le nom affiché dans l'en-tête
      setProfileFeedback({ variant: "success", message: "Profil mis à jour." });
    } catch (err) {
      setProfileFeedback({ variant: "error", message: getErrorMessage(err) });
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        variant: "error",
        message: "Les deux nouveaux mots de passe ne correspondent pas.",
      });
      return;
    }
    try {
      await api.patch("/users/me/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({
        variant: "success",
        message: "Mot de passe modifié.",
      });
    } catch (err) {
      setPasswordFeedback({ variant: "error", message: getErrorMessage(err) });
    }
  };

  return (
    <>
      <PageMeta title="Mon profil | Coworking" description="Mon profil" />
      <PageBreadcrumb pageTitle="Mon profil" />

      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
              {user?.firstName[0]}
              {user?.lastName[0]}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                {user?.firstName} {user?.lastName}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            <Badge color={user?.role === "admin" ? "primary" : "light"}>
              {user?.role === "admin" ? "Administrateur" : "Membre"}
            </Badge>
          </div>
        </Card>

        <Card title="Informations personnelles">
          <form onSubmit={saveProfile} className="space-y-5">
            {profileFeedback && (
              <Alert
                variant={profileFeedback.variant}
                title={
                  profileFeedback.variant === "success"
                    ? "C'est fait"
                    : "Erreur"
                }
                message={profileFeedback.message}
              />
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" size="sm">
              Enregistrer
            </Button>
          </form>
        </Card>

        <Card title="Changer le mot de passe">
          <form onSubmit={changePassword} className="space-y-5">
            {passwordFeedback && (
              <Alert
                variant={passwordFeedback.variant}
                title={
                  passwordFeedback.variant === "success"
                    ? "C'est fait"
                    : "Erreur"
                }
                message={passwordFeedback.message}
              />
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <Label htmlFor="current">Mot de passe actuel</Label>
                <Input
                  id="current"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="new">Nouveau (8 caractères min.)</Label>
                <Input
                  id="new"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="confirm">Confirmer</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" size="sm">
              Changer le mot de passe
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
      {title && (
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
