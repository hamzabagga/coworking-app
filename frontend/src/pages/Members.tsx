import { api, getErrorMessage } from "@/api/client";
import type { Role, User } from "@/api/types";
import { Cell, DataTable, Row, RowAction } from "@/components/common/DataTable";
import FormModal from "@/components/common/FormModal";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import SelectField from "@/components/form/SelectField";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import { PlusIcon } from "@/icons";
import { useCallback, useEffect, useState } from "react";

interface MemberForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  isActive: boolean;
}

const emptyForm: MemberForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "member",
  isActive: true,
};

const roleOptions = [
  { value: "member", label: "Membre" },
  { value: "admin", label: "Administrateur" },
];

export default function Members() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    api
      .get<User[]>("/users")
      .then((res) => setUsers(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
      password: "",
      role: user.role,
      isActive: user.isActive,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormError("");
    const { password, isActive, ...common } = form;
    try {
      if (editing) {
        // le mot de passe n'est pas modifiable ici (route /users/me/password)
        await api.patch(`/users/${editing._id}`, { ...common, isActive });
      } else {
        await api.post("/users", { ...common, password });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user: User) => {
    setError("");
    try {
      await api.patch(`/users/${user._id}`, { isActive: !user.isActive });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (user: User) => {
    if (
      !window.confirm(
        `Supprimer définitivement ${user.firstName} ${user.lastName} ? Vous pouvez aussi simplement le désactiver.`,
      )
    )
      return;
    setError("");
    try {
      await api.delete(`/users/${user._id}`);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const update = (field: keyof MemberForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <PageMeta
        title="Membres | Coworking"
        description="Membres du coworking"
      />
      <PageBreadcrumb pageTitle="Membres" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {users.length} compte(s). Un compte désactivé ne peut plus se
          connecter.
        </p>
        <Button size="sm" onClick={openCreate} startIcon={<PlusIcon />}>
          Ajouter un membre
        </Button>
      </div>

      {error && (
        <div className="mb-5">
          <Alert variant="error" title="Erreur" message={error} />
        </div>
      )}

      <DataTable
        columns={["Nom", "Email", "Téléphone", "Rôle", "Statut", "Actions"]}
        isEmpty={loaded && users.length === 0}
        empty="Aucun membre."
      >
        {users.map((user) => {
          const isMe = user._id === currentUser?._id;
          return (
            <Row key={user._id}>
              <Cell className="font-medium text-gray-800 dark:text-white/90">
                {user.firstName} {user.lastName}
                {isMe && <span className="ms-1 text-theme-xs">(vous)</span>}
              </Cell>
              <Cell>{user.email}</Cell>
              <Cell>{user.phone || "—"}</Cell>
              <Cell>
                <Badge
                  size="sm"
                  color={user.role === "admin" ? "primary" : "light"}
                >
                  {user.role === "admin" ? "Admin" : "Membre"}
                </Badge>
              </Cell>
              <Cell>
                <Badge size="sm" color={user.isActive ? "success" : "error"}>
                  {user.isActive ? "Actif" : "Désactivé"}
                </Badge>
              </Cell>
              <Cell>
                <div className="flex gap-3">
                  <RowAction onClick={() => openEdit(user)}>Modifier</RowAction>
                  {!isMe && (
                    <>
                      <RowAction onClick={() => toggleActive(user)}>
                        {user.isActive ? "Désactiver" : "Activer"}
                      </RowAction>
                      <RowAction danger onClick={() => handleDelete(user)}>
                        Supprimer
                      </RowAction>
                    </>
                  )}
                </div>
              </Cell>
            </Row>
          );
        })}
      </DataTable>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier le membre" : "Ajouter un membre"}
        error={formError}
        submitting={submitting}
        onSubmit={handleSubmit}
      >
        <div>
          <Label htmlFor="firstName">Prénom *</Label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Nom *</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        {!editing && (
          <div>
            <Label htmlFor="password">Mot de passe (8 caractères min.) *</Label>
            <Input
              id="password"
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <Label htmlFor="role">Rôle</Label>
          <SelectField
            id="role"
            options={roleOptions}
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
            // un admin ne peut pas se retirer ses propres droits
            disabled={editing?._id === currentUser?._id}
          />
        </div>
      </FormModal>
    </>
  );
}
