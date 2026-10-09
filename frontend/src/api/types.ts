// Types des objets renvoyés par l'API NestJS (voir backend/README.md)

export type Role = "admin" | "member";

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export type SpaceType =
  "desk" | "private_office" | "meeting_room" | "event_space";

export interface Space {
  _id: string;
  name: string;
  description?: string;
  type: SpaceType;
  capacity: number;
  pricePerHour: number;
  amenities: string[];
  location?: string;
  imageUrl?: string;
  isActive: boolean;
}

export type ReservationStatus = "confirmed" | "cancelled";

export interface Reservation {
  _id: string;
  // peuplés par l'API ; null si l'utilisateur ou l'espace a été supprimé
  user: Pick<User, "_id" | "firstName" | "lastName" | "email"> | null;
  space: Pick<Space, "_id" | "name" | "type" | "location"> | null;
  startTime: string;
  endTime: string;
  attendees: number;
  totalPrice: number;
  status: ReservationStatus;
  notes?: string;
}

export interface Availability {
  space: { id: string; name: string };
  date: string;
  bookedSlots: { startTime: string; endTime: string }[];
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
