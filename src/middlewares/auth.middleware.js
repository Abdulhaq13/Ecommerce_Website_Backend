import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    throw new ApiError(401, "Unauthorized request");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    // Covers both invalid signature and expired token (TokenExpiredError extends JsonWebTokenError)
    throw new ApiError(401, "Invalid or expired access token");
  }

  const user = await User.findById(decodedToken._id);
  if (!user) {
    throw new ApiError(401, "Invalid access token — user not found");
  }
  req.user = user;
  next();
});
