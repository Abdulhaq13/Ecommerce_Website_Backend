class ApiError extends Error {
  // errorCode: optional machine-readable reason the client can branch on
  // (e.g. "EMAIL_NOT_VERIFIED"), sent as `code` in the error response.
  constructor(statusCode, message = "Something went wrong", errorCode) {
    super(message); //Calls the parent Error constructor.
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; //Used to distinguish operational and programming error
    Error.captureStackTrace(this, this.constructor);
    // this → attach the stack trace to this error object.
    // this.constructor → exclude the constructor from the stack trace.
  }
}

export default ApiError;
