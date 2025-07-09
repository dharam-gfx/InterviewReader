import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * User service layer for handling user-related business logic
 */
class UserService {
    /**
     * Get user with clean profile information
     * @param {string} userId - User ID
     * @returns {Object} Clean user profile data
     */
    static async getUserProfile(userId) {
        const user = await User.findById(userId).select("-__v");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return this.formatCleanUserProfile(user);
    }

    /**
     * Format user profile with only necessary information
     * @param {Object} user - User document
     * @returns {Object} Clean profile data
     */
    static formatCleanUserProfile(user) {
        const userData = user.toJSON();
        
        return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            avatar: userData.avatar,
            skills: userData.skills || [],
            currentCompany: userData.currentCompany,
            totalExperience: userData.totalExperience,
            isActive: userData.isActive,
            lastLoginAt: userData.lastLoginAt,
            loginCount: userData.loginCount, // Now represents active sessions
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
        };
    }

    /**
     * Update user profile with validation
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated user
     */
    static async updateUserProfile(userId, updateData) {
        // Filter out undefined values
        const cleanUpdateData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        if (Object.keys(cleanUpdateData).length === 0) {
            throw new ApiError(400, "No valid fields to update");
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: cleanUpdateData },
            { new: true, runValidators: true }
        ).select("-__v");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        return user;
    }

    /**
     * Get user bookmarks with pagination
     * @param {string} userId - User ID
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @returns {Object} Bookmarks with pagination info
     */
    static async getUserBookmarks(userId, page = 1, limit = 10) {
        const user = await User.findById(userId)
            .populate({
                path: 'bookmarks',
                options: {
                    skip: (page - 1) * limit,
                    limit: limit,
                    sort: { createdAt: -1 }
                }
            })
            .select('bookmarks');

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const totalBookmarks = await User.findById(userId).select('bookmarks').then(u => u.bookmarks.length);

        return {
            bookmarks: user.bookmarks,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalBookmarks / limit),
                totalItems: totalBookmarks,
                hasNext: page < Math.ceil(totalBookmarks / limit),
                hasPrev: page > 1
            }
        };
    }

    /**
     * Add bookmark with duplicate check
     * @param {string} userId - User ID
     * @param {string} interviewExperienceId - Interview experience ID
     * @returns {Object} Success response
     */
    static async addBookmark(userId, interviewExperienceId) {
        if (!interviewExperienceId) {
            throw new ApiError(400, "Interview experience ID is required");
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        if (user.bookmarks.includes(interviewExperienceId)) {
            throw new ApiError(400, "Interview experience already bookmarked");
        }

        user.bookmarks.push(interviewExperienceId);
        await user.save();

        return { 
            bookmarkId: interviewExperienceId,
            totalBookmarks: user.bookmarks.length
        };
    }

    /**
     * Remove bookmark
     * @param {string} userId - User ID
     * @param {string} interviewExperienceId - Interview experience ID
     * @returns {Object} Success response
     */
    static async removeBookmark(userId, interviewExperienceId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const initialLength = user.bookmarks.length;
        user.bookmarks = user.bookmarks.filter(
            bookmark => bookmark.toString() !== interviewExperienceId
        );

        if (user.bookmarks.length === initialLength) {
            throw new ApiError(404, "Bookmark not found");
        }

        await user.save();

        return { 
            removedBookmarkId: interviewExperienceId,
            totalBookmarks: user.bookmarks.length
        };
    }
}

export default UserService;
