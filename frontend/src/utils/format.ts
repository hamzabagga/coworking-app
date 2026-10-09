import type { SpaceType } from "@/api/types";

export const spaceTypeLabels: Record<SpaceType, string> = {
  desk: "Bureau partagé",
  private_office: "Bureau privé",
  meeting_room: "Salle de réunion",
  event_space: "Espace événementiel",
};

const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});
const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" });
const priceFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export const formatDateTime = (iso: string) =>
  dateTimeFormat.format(new Date(iso));
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
export const formatPrice = (value: number) => priceFormat.format(value);

// "2026-10-10" + "09:30" (heure locale) → date ISO pour l'API
export const toIso = (date: string, time: string) =>
  new Date(`${date}T${time}`).toISOString();

// date du jour au format YYYY-MM-DD (heure locale)
export const todayInputValue = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
};
