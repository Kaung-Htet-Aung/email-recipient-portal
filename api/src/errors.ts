const REASONS: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
}

export interface ErrorBody {
  message: string | string[]
  error: string
  statusCode: number
}

export class HttpError extends Error {
  status: number
  messages: string[]

  constructor(status: number, message: string | string[]) {
    super(Array.isArray(message) ? message.join(', ') : message)
    this.status = status
    this.messages = Array.isArray(message) ? message : [message]
  }

  toBody(): ErrorBody {
    return {
      message: this.messages.length === 1 ? this.messages[0] : this.messages,
      error: REASONS[this.status] ?? 'Error',
      statusCode: this.status,
    }
  }
}

export function badRequest(message: string | string[]): HttpError {
  return new HttpError(400, message)
}

export function unauthorized(message: string): HttpError {
  return new HttpError(401, message)
}

export function forbidden(message: string): HttpError {
  return new HttpError(403, message)
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message)
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message)
}

export function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof HttpError) return err.toBody()
  return {
    message: 'Internal server error',
    error: 'Internal Server Error',
    statusCode: 500,
  }
}