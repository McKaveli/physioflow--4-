export class AppError extends Error {
  statusCode: number;
  publicMessage: string;
  details?: unknown;

  constructor(statusCode: number, publicMessage: string, details?: unknown) {
    super(publicMessage);
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.details = details;
  }

  static badRequest(message = "That request doesn't look right.", details?: unknown) {
    return new AppError(400, message, details);
  }
  static unauthorized(message = "You need to be logged in to do that.") {
    return new AppError(401, message);
  }
  static forbidden(message = "You don't have permission to do that.") {
    return new AppError(403, message);
  }
  static notFound(message = "We couldn't find what you're looking for.") {
    return new AppError(404, message);
  }
  static conflict(message = "That conflicts with something that already exists.") {
    return new AppError(409, message);
  }
  static internal(message = "Something went wrong on our end. Please try again.") {
    return new AppError(500, message);
  }
}
