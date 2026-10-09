import { api, getErrorMessage } from "@/api/client";
import type { Space, SpaceType } from "@/api/types";
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
import { formatPrice, spaceTypeLabels } from "@/utils/format";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface SpaceForm {
  name: string;
  type: SpaceType;
  capacity: string;
  pricePerHour: string;
  location: string;
  amenities: string;
  description: string;
  isActive: boolean;
}

const emptyForm: SpaceForm = {
  name: "",
  type: "desk",
  capacity: "1",
  pricePerHour: "",
  location: "",
  amenities: "",
  description: "",
  isActive: true,
};

const typeOptions = Object.entries(spaceTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export default function Spaces() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  // modale d'ajout / modification (editing = null → ajout)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Space | null>(null);
  const [form, setForm] = useState<SpaceForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    // l'admin voit aussi les espaces désactivés
    api
      .get<Space[]>("/spaces", {
        params: isAdmin ? { includeInactive: true } : {},
      })
      .then((res) => setSpaces(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoaded(true));
  }, [isAdmin]);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (space: Space) => {
    setEditing(space);
    setForm({
      name: space.name,
      type: space.type,
      capacity: String(space.capacity),
      pricePerHour: String(space.pricePerHour),
      location: space.location ?? "",
      amenities: space.amenities.join(", "),
      description: space.description ?? "",
      isActive: space.isActive,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setFormError("");
    const payload = {
      name: form.name,
      type: form.type,
      capacity: Number(form.capacity),
      pricePerHour: Number(form.pricePerHour),
      location: form.location,
      description: form.description,
      amenities: form.amenities
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await api.patch(`/spaces/${editing._id}`, payload);
      } else {
        await api.post("/spaces", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (space: Space) => {
    if (!window.confirm(`Supprimer l'espace « ${space.name} » ?`)) return;
    setError("");
    try {
      await api.delete(`/spaces/${space._id}`);
      load();
    } catch (err) {
      // 409 : l'espace a encore des réservations à venir
      setError(getErrorMessage(err));
    }
  };

  const update = (field: keyof SpaceForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <>
      <PageMeta
        title="Espaces | Coworking"
        description="Espaces du coworking"
      />
      <PageBreadcrumb pageTitle="Espaces" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isAdmin
            ? "Gérez les espaces proposés à la réservation."
            : "Choisissez un espace puis réservez un créneau."}
        </p>
        {isAdmin && (
          <Button size="sm" onClick={openCreate} startIcon={<PlusIcon />}>
            Ajouter un espace
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-5">
          <Alert variant="error" title="Erreur" message={error} />
        </div>
      )}

      <DataTable
        columns={[
          "Nom",
          "Type",
          "Capacité",
          "Prix / heure",
          "Équipements",
          "Statut",
          "Actions",
        ]}
        isEmpty={loaded && spaces.length === 0}
        empty="Aucun espace pour le moment."
      >
        {spaces.map((space) => (
          <Row key={space._id}>
            <Cell>
              <span className="block font-medium text-gray-800 dark:text-white/90">
                {space.name}
              </span>
              {space.location && (
                <span className="block text-theme-xs">{space.location}</span>
              )}
            </Cell>
            <Cell>{spaceTypeLabels[space.type]}</Cell>
            <Cell>{space.capacity} pers.</Cell>
            <Cell>{formatPrice(space.pricePerHour)}</Cell>
            <Cell className="whitespace-normal">
              {space.amenities.join(", ") || "—"}
            </Cell>
            <Cell>
              <Badge size="sm" color={space.isActive ? "success" : "light"}>
                {space.isActive ? "Actif" : "Désactivé"}
              </Badge>
            </Cell>
            <Cell>
              <div className="flex gap-3">
                {space.isActive && (
                  <RowAction
                    onClick={() =>
                      navigate(`/reservations?spaceId=${space._id}`)
                    }
                  >
                    Réserver
                  </RowAction>
                )}
                {isAdmin && (
                  <>
                    <RowAction onClick={() => openEdit(space)}>
                      Modifier
                    </RowAction>
                    <RowAction danger onClick={() => handleDelete(space)}>
                      Supprimer
                    </RowAction>
                  </>
                )}
              </div>
            </Cell>
          </Row>
        ))}
      </DataTable>

      <FormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifier l'espace" : "Ajouter un espace"}
        error={formError}
        submitting={submitting}
        onSubmit={handleSubmit}
      >
        <div>
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Type *</Label>
          <SelectField
            id="type"
            options={typeOptions}
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="capacity">Capacité (personnes) *</Label>
          <Input
            id="capacity"
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => update("capacity", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="price">Prix par heure (€) *</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step={0.01}
            value={form.pricePerHour}
            onChange={(e) => update("pricePerHour", e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="location">Emplacement</Label>
          <Input
            id="location"
            placeholder="ex. 2e étage"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="amenities">Équipements</Label>
          <Input
            id="amenities"
            placeholder="wifi, écran, tableau blanc"
            value={form.amenities}
            onChange={(e) => update("amenities", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-700 sm:col-span-2 dark:text-gray-400">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => update("isActive", e.target.checked)}
            className="size-4 accent-brand-500"
          />
          Espace actif (réservable)
        </label>
      </FormModal>
    </>
  );
}
