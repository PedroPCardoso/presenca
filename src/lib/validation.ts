import { z } from "zod";
import { isISODate } from "./dates";
import { cleanName } from "./names";

export const nameSchema = z
  .string()
  .transform(cleanName)
  .pipe(z.string().min(1, "Informe o nome").max(60, "Nome muito longo"));

export const kindSchema = z.enum(["adulto", "crianca"]);

export const dateSchema = z.string().refine(isISODate, "Data inválida");

export const attendanceInputSchema = z.object({
  groupId: z.number().int().positive(),
  date: dateSchema,
  people: z
    .array(
      z.object({
        memberId: z.number().int().positive().nullable(),
        name: nameSchema,
        kind: kindSchema,
        isVisitor: z.boolean(),
      }),
    )
    .max(300),
});

export type AttendanceInput = z.infer<typeof attendanceInputSchema>;
