import { z } from "zod";
import { isISODate } from "./dates";
import { cleanName } from "./names";

export const nameSchema = z
  .string()
  .transform(cleanName)
  .pipe(z.string().min(1, "Informe o nome").max(60, "Nome muito longo"));

export const kindSchema = z.enum(["adulto", "crianca"]);

export const dateSchema = z.string().refine(isISODate, "Data inválida");

/** O que a tela de lista envia ao confirmar (o GC vem do contexto: sessão ou link). */
export const listSubmissionSchema = z.object({
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

export type ListSubmission = z.input<typeof listSubmissionSchema>;
export type ListPeople = z.output<typeof listSubmissionSchema>["people"];
