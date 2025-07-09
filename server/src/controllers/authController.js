import axios from "axios";
import { body, validationResult } from "express-validator";
import { loginOrCreateUser } from "../Shared/LoginOrCreateUser.js";

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// OAuth provider configurations
const OAUTH_CONFIGS = {
    google: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        profileUrl: "https://www.googleapis.com/oauth2/v1/userinfo",
        scopes: "email profile"
    },
    github: {
        authUrl: "https://github.com/login/oauth/authorize",
        tokenUrl: "https://github.com/login/oauth/access_token",
        profileUrl: "https://api.github.com/user",
        scopes: "user:email"
    },
    linkedin: {
        authUrl: "https://www.linkedin.com/oauth/v2/authorization",
        tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
        profileUrl: "https://api.linkedin.com/v2/me",
        emailUrl: "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        scopes: "r_liteprofile r_emailaddress"
    }
};

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Validates OAuth callback parameters
 */
const validateOAuthCallback = [
    body('code').optional().isString().trim().isLength({ min: 1 }),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.error('OAuth validation errors:', errors.array());
            return res.redirect(`${CLIENT_URL}?error=invalid_input`);
        }
        next();
    }
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Handles OAuth errors and redirects with appropriate error message
 * @param {Error} error - The error object
 * @param {Response} res - Express response object
 * @param {string} provider - OAuth provider name
 */
const handleOAuthError = (error, res, provider) => {
    console.error(`${provider} OAuth error:`, {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
    });
    
    let errorCode = 'oauth_failed';
    if (error.response?.status === 400) {
        errorCode = 'invalid_request';
    } else if (error.response?.status === 401) {
        errorCode = 'unauthorized';
    }
    
    res.redirect(`${CLIENT_URL}?error=${errorCode}&provider=${provider}`);
};

/**
 * Validates authorization code from OAuth callback
 * @param {string} code - Authorization code
 * @param {Response} res - Express response object
 * @param {string} provider - OAuth provider name
 * @returns {boolean} - Returns true if valid, false otherwise
 */
const validateAuthCode = (code, res, provider) => {
    if (!code) {
        console.error(`${provider} OAuth: No authorization code received`);
        res.redirect(`${CLIENT_URL}?error=no_code&provider=${provider}`);
        return false;
    }
    return true;
};

// =============================================================================
// GOOGLE OAUTH CONTROLLERS
// =============================================================================

/**
 * Initiates Google OAuth flow
 * @param {Request} _ - Express request object (unused)
 * @param {Response} res - Express response object
 */
export const googleAuth = (_, res) => {
    try {
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            response_type: "code",
            scope: OAUTH_CONFIGS.google.scopes,
            access_type: "offline"
        });

        const authUrl = `${OAUTH_CONFIGS.google.authUrl}?${params.toString()}`;
        res.redirect(authUrl);
    } catch (error) {
        handleOAuthError(error, res, 'google');
    }
};

/**
 * Handles Google OAuth callback
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!validateAuthCode(code, res, 'google')) {
            return;
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(OAUTH_CONFIGS.google.tokenUrl, null, {
            params: {
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code"
            }
        });

        const { access_token } = tokenResponse.data;

        // Fetch user profile
        const profileResponse = await axios.get(OAUTH_CONFIGS.google.profileUrl, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const profile = profileResponse.data;

        // Login or create user
        await loginOrCreateUser({
            provider: "google",
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatar: profile.picture,
            res,
            req
        });

    } catch (error) {
        handleOAuthError(error, res, 'google');
    }
};

// =============================================================================
// GITHUB OAUTH CONTROLLERS
// =============================================================================

/**
 * Initiates GitHub OAuth flow
 * @param {Request} _ - Express request object (unused)
 * @param {Response} res - Express response object
 */
export const githubAuth = (_, res) => {
    try {
        const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID,
            redirect_uri: process.env.GITHUB_REDIRECT_URI,
            scope: OAUTH_CONFIGS.github.scopes
        });

        const authUrl = `${OAUTH_CONFIGS.github.authUrl}?${params.toString()}`;
        res.redirect(authUrl);
    } catch (error) {
        handleOAuthError(error, res, 'github');
    }
};

/**
 * Handles GitHub OAuth callback
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const githubCallback = async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!validateAuthCode(code, res, 'github')) {
            return;
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(OAUTH_CONFIGS.github.tokenUrl, {
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: process.env.GITHUB_REDIRECT_URI
        }, {
            headers: { Accept: "application/json" }
        });

        const { access_token } = tokenResponse.data;

        // Fetch user profile
        const profileResponse = await axios.get(OAUTH_CONFIGS.github.profileUrl, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const profile = profileResponse.data;

        // Login or create user
        await loginOrCreateUser({
            provider: "github",
            id: profile.id.toString(), // Ensure string format
            email: profile.email || `user${profile.id}@github.com`,
            name: profile.name || profile.login,
            avatar: profile.avatar_url,
            res,
            req
        });

    } catch (error) {
        handleOAuthError(error, res, 'github');
    }
};

// =============================================================================
// LINKEDIN OAUTH CONTROLLERS
// =============================================================================

/**
 * Initiates LinkedIn OAuth flow
 * @param {Request} _ - Express request object (unused)
 * @param {Response} res - Express response object
 */
export const linkedinAuth = (_, res) => {
    try {
        const params = new URLSearchParams({
            response_type: "code",
            client_id: process.env.LINKEDIN_CLIENT_ID,
            redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
            scope: OAUTH_CONFIGS.linkedin.scopes
        });

        const authUrl = `${OAUTH_CONFIGS.linkedin.authUrl}?${params.toString()}`;
        res.redirect(authUrl);
    } catch (error) {
        handleOAuthError(error, res, 'linkedin');
    }
};

/**
 * Handles LinkedIn OAuth callback
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export const linkedinCallback = async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!validateAuthCode(code, res, 'linkedin')) {
            return;
        }

        // Exchange code for access token
        const tokenResponse = await axios.post(OAUTH_CONFIGS.linkedin.tokenUrl, null, {
            params: {
                grant_type: "authorization_code",
                code,
                redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
                client_id: process.env.LINKEDIN_CLIENT_ID,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET
            }
        });

        const { access_token } = tokenResponse.data;

        // Fetch user email
        const emailResponse = await axios.get(OAUTH_CONFIGS.linkedin.emailUrl, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const emailData = emailResponse.data;

        // Fetch user profile
        const profileResponse = await axios.get(OAUTH_CONFIGS.linkedin.profileUrl, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const profile = profileResponse.data;

        // Validate email data
        if (!emailData.elements || !emailData.elements[0] || !emailData.elements[0]["handle~"]) {
            throw new Error("Unable to retrieve email from LinkedIn");
        }

        // Login or create user
        await loginOrCreateUser({
            provider: "linkedin",
            id: profile.id,
            email: emailData.elements[0]["handle~"].emailAddress,
            name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
            avatar: "", // LinkedIn doesn't provide direct avatar in basic scopes
            res,
            req
        });

    } catch (error) {
        handleOAuthError(error, res, 'linkedin');
    }
};

// =============================================================================
// EXPORTS
// =============================================================================

// Export the imported logout functions
export { logout, logoutAllDevices } from "../Shared/LogoutUser.js";

