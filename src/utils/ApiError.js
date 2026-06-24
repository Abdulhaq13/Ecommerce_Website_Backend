class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong") {
    super(message); //Calls the parent Error constructor.
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; //Used to distinguish operational and programming error
    Error.captureStackTrace(this, this.constructor);
    // this → attach the stack trace to this error object.
    // this.constructor → exclude the constructor from the stack trace.
  }
}

export default ApiError;
