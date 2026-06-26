import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
// Optional auth middleware: Checks if a user is logged in but NEVER blocks the request.
// If the token is missing, invalid, or expired, it simply moves to next()
// leaving req.user unset (treating them as a guest). Useful for public routes
// that show extra info to logged-in users/admins.

// Everyone is welcome, but members get VIP treatment." Guests get the basic package; logged-in users get the personalized/upgrade package.

const optionalAuth = async (req, res, next) => {
  try {
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) return next();

    const decodedToken = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET,
    );
    const user = await User.findById(decodedToken._id);

    if (!user) {
      return next();
    }
    req.user = user;
    return next();
  } catch (error) {
    return next();
  }
};

export { optionalAuth };
