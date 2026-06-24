import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import crypto from "crypto";

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  //1.Validate required fields
  if ([name, email, password].some((field) => !field || field.trim() === "")) {
    throw new ApiError(400, "Name,email, and password are required");
  }

  //2.Check existing user by email
  const existedUser = await User.findOne({ email: email.toLowerCase() });

  if (existedUser) {
    throw new ApiError(409, "User with this email already exist");
  }

  //3.Generate email verifiation token (raw + hashed)
  const rawVerificationToken = crypto.randomBytes(32).toString("hex");
  const hashedVerificationToken = crypto
    .createHash("sha256")
    .update(rawVerificationToken)
    .digest("hex");

  const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000; //24 hours

  //4.Create user
  const user = await User.create({
    name,
    email,
    password,
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpiry: verificationExpiry,
  });

  // TODO: send verification email with rawVerificationToken via Nodemailer
  // (to be implemented in the Nodemailer setup step)

  //5.Return created user (sensitive fields excluded by select:false)
  const createdUser = await User.findById(user._id);

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        createdUser,
        "User registered successfully. Verification email pending",
      ),
    );
});

export { registerUser };
