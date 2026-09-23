import { ZodError } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.issues.map((issue) => ({
        field: issue.path.join(".") || "unknown",
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        // Same top-level message field as every other error response
        message: errors[0]?.message || "Invalid request data",
        errors,
      });
    }
    return next(err);
  }
};
