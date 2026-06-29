import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinaryUpload.js";

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

export { updateProfile };
