import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Translate known library errors into proper client errors instead of 500s.
  if (err.name === "CastError") {
    // e.g. /products/abc — a malformed ObjectId in a param, query, or body
    error = new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  } else if (err.name === "ValidationError") {
    // Mongoose schema validation failed on save
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    error = new ApiError(400, message || "Invalid data");
  } else if (err.code === 11000) {
    // Unique index violation (e.g. duplicate email or category name)
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new ApiError(409, `A record with this ${field} already exists`);
  } else if (err.name === "MulterError") {
    // e.g. file over 5MB or too many files
    error = new ApiError(400, err.message);
  }

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message);
  }

  // FIX: Quiet down the terminal for unauthenticated guest traffic (401)
  if (error.statusCode === 401) {
    console.log(
      `[Auth Notice] Guest blocked at ${req.originalUrl}: ${error.message}`,
    );
  } else {
    // Keep printing the full stack trace for real errors (like 500) so you can debug them
    console.error(error);
  }

  return res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(error.errorCode && { code: error.errorCode }),
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export default errorHandler;
