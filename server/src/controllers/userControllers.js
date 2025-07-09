import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import UserService from "../services/userService.js";
import SessionService from "../services/sessionService.js";

// Get current user profile
const getCurrentUser = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const userData = await UserService.getUserProfile(userId);

    return res.status(200).json(
        new ApiResponse(200, "User profile fetched successfully", userData)
    );
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
    const { name, skills, currentCompany, totalExperience } = req.body;
    
    const updateData = {
        name,
        skills,
        currentCompany,
        totalExperience
    };

    const user = await UserService.updateUserProfile(req.user._id, updateData);

    return res.status(200).json(
        new ApiResponse(200, "User profile updated successfully", user)
    );
});

// Get user bookmarks
const getUserBookmarks = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const bookmarksData = await UserService.getUserBookmarks(req.user._id, page, limit);

    return res.status(200).json(
        new ApiResponse(200, "User bookmarks fetched successfully", bookmarksData)
    );
});

// Add bookmark
const addBookmark = asyncHandler(async (req, res) => {
    const { interviewExperienceId } = req.body;
    
    const result = await UserService.addBookmark(req.user._id, interviewExperienceId);

    return res.status(200).json(
        new ApiResponse(200, "Bookmark added successfully", result)
    );
});

// Remove bookmark
const removeBookmark = asyncHandler(async (req, res) => {
    const { interviewExperienceId } = req.params;
    
    const result = await UserService.removeBookmark(req.user._id, interviewExperienceId);

    return res.status(200).json(
        new ApiResponse(200, "Bookmark removed successfully", result)
    );
});

// Logout from all other devices
const logoutAllOtherDevices = asyncHandler(async (req, res) => {
    const currentAccessToken = req.tokenInfo?.accessToken;
    
    const result = await SessionService.invalidateAllOtherSessions(req.user._id, currentAccessToken);

    return res.status(200).json(
        new ApiResponse(200, "Logged out from all other devices successfully", result)
    );
});

export {
    getCurrentUser,
    updateUserProfile,
    getUserBookmarks,
    addBookmark,
    removeBookmark,
    logoutAllOtherDevices
};