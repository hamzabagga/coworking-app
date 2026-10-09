import { api, getErrorMessage, getErrorStatus } from "@/api/client";
import type { Availability, Reservation, Space } from "@/api/types";
import { Cell, DataTable, Row, RowAction } from "@/components/common/DataTable";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import SelectField from "@/components/form/SelectField";
import Input from "@/components/form/input/InputField";
import Alert from "@/components/ui/alert/Alert";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useAuth } from "@/context/AuthContext";
import {
  formatDateTime,
  formatPrice,
  formatTime,
  toIso,
  todayInputValue,
} from "@/utils/format";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

type Feedback = {
  variant: "success" | "error" | "warning";
  title: string;
  message: string;
};

export default function Reservations() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [listError, setListError] = useState("");

  // formulaire de réservation (spaceId pré-rempli depuis la page Espaces)
  const [spaceId, setSpaceId] = useState(searchParams.get("spaceId") ?? "");
  const [date, setDate] = useState(todayInputValue());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [attendees, setAttendees] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [availability, setAvailability] = useState<Availability | null>(null);

  const selectedSpace = spaces.find((s) => s._id === spaceId);

  const loadReservations = useCallback(() => {
    api
      .get<Reservation[]>("/reservations")
      .then((res) => setReservations(res.data))
      .catch((err) => setListError(getErrorMessage(err)))
      .finally(() => setLoaded(true));
  }, []);

  const loadAvailability = useCallback(() => {
    if (!spaceId || !date) return;
    api
      .get<Availability>(`/spaces/${spaceId}/availability`, {
        params: { date },
      })
      .then((res) => setAvailability(res.data))
      .catch(() => setAvailability(null));
  }, [spaceId, date]);

  useEffect(() => {
    api
      .get<Space[]>("/spaces")
      .then((res) => setSpaces(res.data))
      .catch((err) => setListError(getErrorMessage(err)));
    loadReservations();
  }, [loadReservations]);

  useEffect(loadAvailability, [loadAvailability]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!spaceId) {
      setFeedback({
        variant: "error",
        title: "Espace manquant",
        message: "Choisissez un espace à réserver.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post<Reservation>("/reservations", {
        spaceId,
        startTime: toIso(date, startTime),
        endTime: toIso(date, endTime),
        attendees: Number(attendees),
        ...(notes && { notes }),
      });
      setFeedback({
        variant: "success",
        title: "Réservation confirmée",
        message: `${data.space?.name} le ${formatDateTime(data.startTime)} – ${formatTime(data.endTime)}, total ${formatPrice(data.totalPrice)}.`,
      });
      setNotes("");
      loadReservations();
      loadAvailability();
    } catch (err) {
      if (getErrorStatus(err) === 409) {
        setFeedback({
          variant: "warning",
          title: "Créneau déjà pris",
          message: `${selectedSpace?.name ?? "Cet espace"} est déjà réservé sur une partie de ce créneau (${startTime} – ${endTime}). Choisissez un autre horaire : les créneaux occupés sont listés sous le formulaire.`,
        });
        loadAvailability();
      } else {
        setFeedback({
          variant: "error",
          title: "Réservation impossible",
          message: getErrorMessage(err),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (reservation: Reservation) => {
    if (!window.confirm("Annuler cette réservation ?")) return;
    setListError("");
    try {
      await api.patch(`/reservations/${reservation._id}/cancel`);
      loadReservations();
      loadAvailability();
    } catch (err) {
      setListError(getErrorMessage(err));
    }
  };

  // un membre ne peut annuler qu'une réservation pas encore commencée
  const canCancel = (r: Reservation) =>
    r.status === "confirmed" && (isAdmin || new Date(r.startTime) > new Date());

  const columns = [
    "Espace",
    ...(isAdmin ? ["Membre"] : []),
    "Début",
    "Fin",
    "Personnes",
    "Prix",
    "Statut",
    "Actions",
  ];

  return (
    <>
      <PageMeta title="Réservations | Coworking" description="Réservations" />
      <PageBreadcrumb pageTitle="Réservations" />

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 lg:p-6 dark:border-gray-800 dark:bg-white/3">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Nouvelle réservation
        </h3>

        {feedback && (
          <div className="mb-5">
            <Alert
              variant={feedback.variant}
              title={feedback.title}
              message={feedback.message}
            />
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Label htmlFor="space">Espace *</Label>
              <SelectField
                id="space"
                placeholder="Choisir un espace"
                value={spaceId}
                onChange={(e) => setSpaceId(e.target.value)}
                options={spaces.map((s) => ({
                  value: s._id,
                  label: `${s.name} — ${s.capacity} pers. — ${formatPrice(s.pricePerHour)}/h`,
                }))}
              />
            </div>
            <div>
              <Label htmlFor="attendees">Nombre de personnes *</Label>
              <Input
                id="attendees"
                type="number"
                min="1"
                max={selectedSpace?.capacity}
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                min={todayInputValue()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="start">Début *</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="end">Fin *</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                placeholder="optionnel"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* n'affiche que les créneaux de l'espace et du jour sélectionnés */}
          {availability?.space.id === spaceId && availability.date === date && (
            <div className="mt-5 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Créneaux déjà réservés ce jour :
              </span>{" "}
              {availability.bookedSlots.length === 0
                ? "aucun, l'espace est libre toute la journée."
                : availability.bookedSlots
                    .map(
                      (s) =>
                        `${formatTime(s.startTime)} – ${formatTime(s.endTime)}`,
                    )
                    .join(", ")}
            </div>
          )}

          <div className="mt-6">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Réservation…" : "Réserver"}
            </Button>
          </div>
        </form>
      </div>

      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {isAdmin ? "Toutes les réservations" : "Mes réservations"}
      </h3>

      {listError && (
        <div className="mb-5">
          <Alert variant="error" title="Erreur" message={listError} />
        </div>
      )}

      <DataTable
        columns={columns}
        isEmpty={loaded && reservations.length === 0}
        empty="Aucune réservation."
      >
        {reservations.map((r) => (
          <Row key={r._id}>
            <Cell className="font-medium text-gray-800 dark:text-white/90">
              {r.space?.name ?? "Espace supprimé"}
            </Cell>
            {isAdmin && (
              <Cell>
                {r.user ? `${r.user.firstName} ${r.user.lastName}` : "—"}
              </Cell>
            )}
            <Cell>{formatDateTime(r.startTime)}</Cell>
            <Cell>{formatDateTime(r.endTime)}</Cell>
            <Cell>{r.attendees}</Cell>
            <Cell>{formatPrice(r.totalPrice)}</Cell>
            <Cell>
              <Badge
                size="sm"
                color={r.status === "confirmed" ? "success" : "error"}
              >
                {r.status === "confirmed" ? "Confirmée" : "Annulée"}
              </Badge>
            </Cell>
            <Cell>
              {canCancel(r) && (
                <RowAction danger onClick={() => handleCancel(r)}>
                  Annuler
                </RowAction>
              )}
            </Cell>
          </Row>
        ))}
      </DataTable>
    </>
  );
}
