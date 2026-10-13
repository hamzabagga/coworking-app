import { getErrorMessage } from "@/api/client";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";

interface SignUpFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const emptyForm: SignUpFormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export default function SignUpForm() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<SignUpFormState>(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // déjà connecté : inutile de rester sur la page d'inscription
  if (user) return <Navigate to="/" replace />;

  const update = (field: keyof SignUpFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }

    setSubmitting(true);
    try {
      const { firstName, lastName, email, password, phone } = form;
      await register({
        firstName,
        lastName,
        email,
        password,
        ...(phone && { phone }),
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const passwordToggle = (
    <span
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-e-4 top-1/2 z-30 -translate-y-1/2 cursor-pointer"
    >
      {showPassword ? (
        <EyeIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
      ) : (
        <EyeCloseIcon className="size-5 fill-gray-500 dark:fill-gray-400" />
      )}
    </span>
  );

  return (
    <div className="no-scrollbar flex w-full flex-1 flex-col overflow-y-auto lg:w-1/2">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 text-title-sm font-semibold text-gray-800 sm:text-title-md dark:text-white/90">
              Inscription
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Créez votre compte membre pour réserver les espaces du coworking.
            </p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {error && (
                <Alert
                  variant="error"
                  title="Inscription impossible"
                  message={error}
                />
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">
                    Prénom <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Votre prénom"
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">
                    Nom <span className="text-error-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Votre nom"
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Optionnel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  autoComplete="tel"
                />
              </div>
              <div>
                <Label htmlFor="password">
                  Mot de passe (8 caractères min.){" "}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Choisissez un mot de passe"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  {passwordToggle}
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword">
                  Confirmer le mot de passe{" "}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Retapez le mot de passe"
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div>
                <Button
                  type="submit"
                  className="w-full"
                  size="sm"
                  disabled={submitting}
                >
                  {submitting ? "Création du compte…" : "Créer mon compte"}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-center text-sm font-normal text-gray-700 sm:text-start dark:text-gray-400">
              Déjà un compte ?{" "}
              <Link
                to="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
