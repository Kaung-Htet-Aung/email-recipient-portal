import { z } from 'zod'
import { badRequest } from './errors'

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw badRequest(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))
  }
  return result.data
}

export async function parseBody<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>): Promise<T> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw badRequest('Invalid JSON body')
  }
  return parse(schema, body)
}

// Mirror of the NestJS DTOs --------------------------------------------------

export const loginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1, 'password should not be empty'),
  })
  .strict()

const optionalString = z.string().optional()
const optionalDescription = z.string().nullable().optional()

export const createCodeNameSchema = z
  .object({
    code: z.string().min(1, 'code should not be empty'),
    name: z.string().min(1, 'name should not be empty'),
    description: optionalDescription,
  })
  .strict()

export const updateCodeNameSchema = z
  .object({
    code: optionalString,
    name: optionalString,
    description: optionalDescription,
  })
  .strict()

export const recipientCodeSchema = z
  .string()
  .min(1, 'employeeCode should not be empty')
  .regex(/^[A-Z0-9-]+$/i, 'employeeCode must only contain letters, numbers and hyphens')

export const createRecipientSchema = z
  .object({
    employeeCode: recipientCodeSchema,
    name: z.string().min(1, 'name should not be empty'),
    email: z.string().email(),
    departmentId: z.string().optional(),
  })
  .strict()

export const updateRecipientSchema = z
  .object({
    employeeCode: recipientCodeSchema.optional(),
    name: optionalString,
    email: z.string().email().optional(),
    departmentId: z.string().nullable().optional(),
  })
  .strict()

export const statusEnum = z.enum(['ACTIVE', 'INACTIVE'])

export const queryRecipientSchema = z.object({
  search: optionalString,
  departmentId: optionalString,
  status: statusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const createEmailListSchema = z
  .object({
    applicationId: z.string().uuid(),
    code: z.string().min(1, 'code should not be empty'),
    name: z.string().min(1, 'name should not be empty'),
    description: optionalDescription,
  })
  .strict()

export const updateEmailListSchema = z
  .object({
    applicationId: z.string().uuid().optional(),
    code: optionalString,
    name: optionalString,
    description: optionalDescription,
  })
  .strict()

export const recipientTypeEnum = z.enum(['TO', 'CC', 'BCC'])

export const addRecipientSchema = z
  .object({
    recipientId: z.string().uuid(),
    recipientType: recipientTypeEnum.optional(),
    priority: z.coerce.number().int().min(0).optional(),
  })
  .strict()

export const updateRecipientTypeSchema = z
  .object({
    recipientType: recipientTypeEnum,
    priority: z.coerce.number().int().min(0).optional(),
  })
  .strict()

export const createCredentialSchema = z
  .object({
    name: z.string().min(1, 'name should not be empty'),
    description: optionalDescription,
  })
  .strict()

export const queryAuditSchema = z.object({
  search: optionalString,
  entityType: optionalString,
  action: optionalString,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export function parseQuery<T>(schema: z.ZodType<T>, query: Record<string, string | undefined>): T {
  return parse(schema, query)
}