import { z } from "zod";
import { userSchema, type User } from "@/shared/api/schemas";

export { userSchema };
export type { User };

export const roleSchema = z.object({
  role_id: z.number(),
  role_name: z.string(),
});
export type Role = z.infer<typeof roleSchema>;

export const profileSchema = z.object({
  user_id: z.number(),
  full_name: z.string(),
  phone_number: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

export const roleDetailSchema = z.object({
  role_id: z.number(),
  role_name: z.string(),
  permissions: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});
export type RoleDetail = z.infer<typeof roleDetailSchema>;

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
  role_id: number;
  full_name: string;
  phone_number?: string;
  department?: string;
};

export type UpdateUserInput = {
  username?: string;
  email?: string;
  password?: string;
  role_id?: number;
  full_name?: string;
  phone_number?: string;
  department?: string;
};
