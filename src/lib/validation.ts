import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(190);

export const passwordSchema = z
  .string()
  .min(10, "Heslo musí mať aspoň 10 znakov")
  .max(128)
  .regex(/[a-z]/, "Heslo musí obsahovať malé písmeno")
  .regex(/[A-Z]/, "Heslo musí obsahovať veľké písmeno")
  .regex(/[0-9]/, "Heslo musí obsahovať číslicu");

export const registerSchema = z.object({ email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
