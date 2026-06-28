import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Cart } from "../models/cart.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// GET /api/v1/admin/users — paginated list of all users, optional search by name/email
const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.search) {
    // Unified case-insensitive search matching name or email
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  // Return all users regardless of status; flag isActive in response
  const [users, totalUsers] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        pagination: {
          totalUsers,
          totalPages: Math.ceil(totalUsers / limit),
          currentPage: page,
          limit,
        },
      },
      "Users fetched",
    ),
  );
});

// PATCH /api/v1/admin/users/:userId/deactivate — soft delete a user
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  // Block self-deactivation before even hitting the DB — prevents an admin
  // from accidentally locking themselves out.
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // Admins can only deactivate regular users, never other admins —
  // prevents one admin from unilaterally disabling another.
  if (targetUser.role === "admin") {
    throw new ApiError(403, "Cannot deactivate another admin's account");
  }

  if (!targetUser.isActive) {
    throw new ApiError(400, "User is already deactivated");
  }

  targetUser.isActive = false;
  // Clear database refreshToken to invalidate active sessions and prevent token renewal
  targetUser.refreshToken = undefined;
  await targetUser.save({ validateBeforeSave: false });

  // Hard-delete cart for inactive accounts; keep orders intact as frozen history
  await Cart.findOneAndDelete({ user: targetUser._id });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deactivated successfully"));
});

// PATCH /api/v1/admin/users/:userId/role — promote/demote a user
const changeUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId");
  }
  if (!role || !["user", "admin"].includes(role)) {
    throw new ApiError(400, "role must be either 'user' or 'admin'");
  }

  // Prevent self-role modification to avoid accidental admin lockout
  if (userId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot change your own role");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if (targetUser.role === role) {
    throw new ApiError(400, `User already has the role "${role}"`);
  }

  targetUser.role = role;
  await targetUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, targetUser, `User role updated to "${role}"`));
});

// PATCH /api/v1/admin/users/:userId/reactivate — undo a soft delete
const reactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  if (targetUser.isActive) {
    throw new ApiError(400, "User is already active");
  }

  // No self-restrictions needed; reactivation is non-destructive and safe
  targetUser.isActive = true;
  await targetUser.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, targetUser, "User reactivated successfully"));
});

export { getAllUsers, deleteUser, reactivateUser, changeUserRole };
