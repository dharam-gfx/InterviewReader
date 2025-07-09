import { Router } from "express";
import { verifyJwtToken } from "../middlewares/auth.middlewares.js";
import ValidationService from "../services/validationService.js";
import {
    getCurrentUser,
    updateUserProfile,
    getUserBookmarks,
    addBookmark,
    removeBookmark,
    logoutAllOtherDevices
} from "../controllers/userControllers.js";

const router = Router();

// Protected routes - require authentication
router.use(verifyJwtToken); // Apply auth middleware to all routes below

// User profile routes
router.route("/profile").get(getCurrentUser).patch(ValidationService.validateUserProfileUpdate, updateUserProfile);

// Auth routes
router.route("/logout-all-others").post(logoutAllOtherDevices);

// Bookmark routes
router.route("/bookmarks").get(ValidationService.validatePagination, getUserBookmarks).post(ValidationService.validateBookmark, addBookmark);
router.route("/bookmarks/:interviewExperienceId").delete(ValidationService.validateObjectId, removeBookmark);

export default router;
