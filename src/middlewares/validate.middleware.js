import { ZodError } from "zod";

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map((issue) => ({
        field: issue.path.join(".") || "unknown",
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        errors,
      });
    }
  }
};
