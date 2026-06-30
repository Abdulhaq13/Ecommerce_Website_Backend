import ApiError from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

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
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
};

export default errorHandler;
