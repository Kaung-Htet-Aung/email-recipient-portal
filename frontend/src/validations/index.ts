import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const applicationSchema = z.object({
  code: z
    .string()
    .min(1, "Application code is required")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, underscores and hyphens")
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const departmentSchema = z.object({
  code: z
    .string()
    .min(1, "Department code is required")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, underscores and hyphens")
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const recipientSchema = z.object({
  employeeCode: z
    .string()
    .min(1, "Employee code is required")
    .regex(/^[A-Za-z0-9-]+$/, "Only alphanumeric characters and hyphens"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  departmentId: z.string().optional(),
});
export type RecipientInput = z.infer<typeof recipientSchema>;

export const emailListSchema = z.object({
  applicationId: z.string().min(1, "Application is required"),
  code: z
    .string()
    .min(1, "List code is required")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, underscores and hyphens")
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});
export type EmailListInput = z.infer<typeof emailListSchema>;
