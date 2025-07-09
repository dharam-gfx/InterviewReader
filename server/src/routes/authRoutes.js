import express from "express";
import {
    googleAuth,
    googleCallback,
    githubAuth,
    githubCallback,
    linkedinAuth,
    linkedinCallback,
    logout,
    logoutAllDevices
} from "../controllers/authController.js";
import { verifyJwtToken } from "../middlewares/auth.middlewares.js";

const router = express.Router();

// Google OAuth
router.get( "/google", googleAuth );
router.get( "/google/callback", googleCallback );

// GitHub OAuth
router.get( "/github", githubAuth );
router.get( "/github/callback", githubCallback );

// LinkedIn OAuth
router.get( "/linkedin", linkedinAuth );
router.get( "/linkedin/callback", linkedinCallback );

// Logout routes
router.post( "/logout", logout );
router.post( "/logout-all", verifyJwtToken, logoutAllDevices );

export default router;
