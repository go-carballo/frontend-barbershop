import { http } from "@/lib/http";
import type { AppRole, UserRecord } from "@/types";

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: AppRole;
  isActive?: boolean;
};
export type UpdateUserInput = Partial<CreateUserInput>;
export const usersKeys = {
  all: ["users"] as const,
  list: (userId: string) => ["users", "list", userId] as const,
};

/** NestJS UsersController has no query DTO, search, or pagination. */
export const getUsersRequest = (signal?: AbortSignal) => http<UserRecord[]>("/users", { signal });
export const getUserRequest = (id: string, signal?: AbortSignal) =>
  http<UserRecord>(`/users/${encodeURIComponent(id)}`, { signal });
export const createUserRequest = (input: CreateUserInput) =>
  http<UserRecord>("/users", { method: "POST", body: JSON.stringify(input) });
export const updateUserRequest = (id: string, input: UpdateUserInput) =>
  http<UserRecord>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteUserRequest = (id: string) =>
  http<void>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
