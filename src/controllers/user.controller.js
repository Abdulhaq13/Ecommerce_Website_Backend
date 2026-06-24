import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";

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

  //5. Send verification email - here we are sending in params rawToken that can be later used to verify
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${rawVerificationToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your email address",
      html: `
        <h2>Welcome, ${user.name}!</h2>
        <p>Thanks for registering. Please verify your email address by clicking the link below: </p>
        <a href="${verificationUrl}" target="_blank">Verify Email</a>
        <p>This link will expire in 24 hours</p>
        <p>If you did not create this account, please ignore this email.</p>
        `,
    });
  } catch (error) {
    console.log("Email Error:", error);
    await User.findByIdAndDelete(user._id);
    throw new ApiError(
      500,
      "Something went wrong while sending the verification email. Please try registering again.",
    );
  }

  //6.Return created user (sensitive fields excluded by select:false)
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

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }
  // Hash the incoming raw token to match what's stored in DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() }, //gt = greater than
  });

  if (!user) {
    throw new ApiError(400, "Token is invalid or has expired");
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Email verified successfully"));
});
export { registerUser, verifyEmail };
