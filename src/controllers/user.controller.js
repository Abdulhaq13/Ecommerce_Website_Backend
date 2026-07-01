import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

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

const loginUser = asyncHandler(async (req, res) => {
  // Get email and password from request body
  const { email, password } = req.body;

  // Check if both fields are provided
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user by email
  // password has select: false in schema, so explicitly include it
  const user = await User.findOne({
    email: email.toLowerCase(),
  }).select("+password");

  // If user doesn't exist
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Compare entered password with hashed password stored in DB
  const isPasswordValid = await user.isPasswordCorrect(password);

  // If password doesn't match
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Checks account status after password verification to prevent email harvesting.
  if (!user.isActive) {
    throw new ApiError(403, "This account has been deactivated");
  }

  // Generate short-lived access token
  const accessToken = user.generateAccessToken();

  // Generate long-lived refresh token
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in database
  // This helps with logout, token rotation, and revoking sessions
  user.refreshToken = refreshToken;

  // Skip validations because we're only updating refreshToken
  await user.save({ validateBeforeSave: false });

  // Fetch user again without sensitive fields
  // password and refreshToken remain excluded because of select: false
  const loggedInUser = await User.findById(user._id);

  // Common cookie settings
  const cookieOptions = {
    httpOnly: true, // JS cannot access cookie
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // Protection against CSRF
  };

  return (
    res
      .status(200)

      // Store access token in cookie
      .cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      })

      // Store refresh token in cookie
      .cookie("refreshToken", refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })

      // Send success response with user data
      .json(
        new ApiResponse(200, { user: loggedInUser }, "Logged in successfully"),
      )
  );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user was attached by verifyJWT — already excludes password/tokens
  // since those fields are select: false by default on the User model
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing - please log in again");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );
  } catch (error) {
    throw new ApiError(
      401,
      "Invalid or expired refresh token — please log in again",
    );
  }

  const user = await User.findById(decodedToken._id).select("+refreshToken");
  if (!user) {
    throw new ApiError(401, "Invalid refresh token — please log in again");
  }

  // Theft/reuse detection: incoming token must exactly match what's stored in DB.
  // If it doesn't, this token was already rotated out — treat as compromised.
  if (incomingRefreshToken !== user.refreshToken) {
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(
      401,
      "Refresh token reuse detected — please log in again",
    );
  }

  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  const accessTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000, //15m — match ACCESS_TOKEN_EXPIRY
  };

  const refreshTokenOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7d — match REFRESH_TOKEN_EXPIRY
  };

  return res
    .status(200)
    .cookie("accessToken", newAccessToken, accessTokenOptions)
    .cookie("refreshToken", newRefreshToken, refreshTokenOptions)
    .json(new ApiResponse(200, {}, "Access token refreshed successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  // req.user is available because this route is protected by verifyJWT
  await User.findByIdAndUpdate(
    req.user._id,
    //removes a field completely from the document. since after logginf out there is no need to keep refreshToken in database
    { $unset: { refreshToken: 1 } },
    { new: true },
    //findbyidandupdate returns old document which also returns
    // the refreshToken so we use new to get updated document
  );
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return (
    res
      .status(200)
      //clear cookie options should match cookie options in login
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, {}, "Logged out successfully"))
  );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }
  const user = await User.findOne({ email: email.toLowerCase() });

  //User enumeration to prevent attackers to know whether the email exist or not we send
  // same response,status and message regardless of whether the email exist or not
  if (!user) {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "If an account with that email exists, a reset link has been sent",
        ),
      );
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  //this creates resetPasswordToken which is declared in user model
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; //1 hour
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  } catch (error) {
    //Roll back the token, but do NOT roll back the user account — unlike
    // registration, this user already exists; we just failed to email them.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, "Failed to send reset email - please try again");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "If an account with that email exists, a reset link has been sent",
      ),
    );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    throw new ApiError(400, "New password is required");
  }
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  }).select("+resetPasswordToken +resetPasswordExpiry +password");

  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  // Check if new password is the same as the old one
  const isSamePassword = await user.isPasswordCorrect(password);
  if (isSamePassword) {
    throw new ApiError(
      400,
      "New password must be different from your current password",
    );
  }
  user.password = password;

  //need to remove that reset token and expiry when new password is created
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;

  user.refreshToken = undefined;

  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from old password");
  }
  //  req.user came from verifyJWT, which does NOT select password — fetch fresh with it
  const user = await User.findById(req.user._id).select("+password");

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword; // pre-save hook hashes it
  user.refreshToken = undefined;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const deleteAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw new ApiError(400, "Password is required to delete your account");
  }
  const user = await User.findById(req.user._id).select("+password");

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password");
  }

  //avatar should be deleted from cloudinary after deletion from database

  const avatarToDelete = user.avatar?.public_id ? user.avatar.public_id : null;

  await User.findByIdAndDelete(req.user._id);

  if (avatarToDelete) {
    await deleteFromCloudinary(avatarToDelete);
  }
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Account deleted successfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const avatarFile = req.file;

  if (!name && !avatarFile) {
    throw new ApiError(400, "Provide atleast name or avatar to update");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Keep a reference to the OLD avatar so we can delete it from Cloudinary later,
  const oldAvatar = user.avatar?.public_id ? { ...user.avatar } : null;
  if (name) {
    user.name = name;
  }
  if (avatarFile) {
    const uploadResult = await uploadOnCloudinary(avatarFile.path, "avatars");

    if (!uploadResult) {
      throw new ApiError(500, "Failed to upload avatar, please try again");
    }

    user.avatar = {
      public_id: uploadResult.public_id,
      url: uploadResult.url,
    };
  }

  await user.save();

  // Only NOW, after the DB has the new state safely persisted, clean up the old cloudinary image
  if (avatarFile && oldAvatar) {
    await deleteFromCloudinary(oldAvatar.public_id);
  }

  const safeUser = await User.findById(user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, safeUser, "Profile updated successfully"));
});

export {
  registerUser,
  verifyEmail,
  loginUser,
  getCurrentUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteAccount,
  updateProfile,
};
