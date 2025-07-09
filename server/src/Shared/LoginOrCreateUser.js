import User from "../models/User.model.js";
import { generateTokens } from "../utils/Token.js";
import Session from "../models/Session.model.js";

// =============================================================================
// CONSTANTS AND CONFIGURATION
// =============================================================================

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Session management configuration
const SESSION_CONFIG = {
    MAX_SESSIONS_PER_USER: 3,
    ACCESS_TOKEN_EXPIRY_DAYS: 1,
    REFRESH_TOKEN_EXPIRY_DAYS: 10,
    CLEANUP_EXPIRED_ON_LOGIN: true
};

// Cookie configuration
const COOKIE_CONFIG = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
};

// =============================================================================
// USER MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Finds existing user by provider ID or email
 * @param {string} provider - OAuth provider name
 * @param {string} id - Provider-specific user ID
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User object or null if not found
 */
const findExistingUser = async (provider, id, email) => {
    const providerIdField = `${provider}Id`;
    
    return await User.findOne({
        $or: [
            { [providerIdField]: id },
            { email: email }
        ]
    });
};

/**
 * Creates a new user with provider-specific data
 * @param {string} provider - OAuth provider name
 * @param {string} id - Provider-specific user ID
 * @param {string} email - User email address
 * @param {string} name - User display name
 * @param {string} avatar - User avatar URL
 * @returns {Promise<Object>} Created user object
 */
const createNewUser = async (provider, id, email, name, avatar) => {
    const providerIdField = `${provider}Id`;
    
    const userData = {
        [providerIdField]: id,
        email,
        name,
        avatar
    };
    
    return await User.create(userData);
};

/**
 * Updates existing user with provider ID if not already set
 * @param {Object} user - User object to update
 * @param {string} provider - OAuth provider name
 * @param {string} id - Provider-specific user ID
 * @returns {Promise<Object>} Updated user object
 */
const updateUserProviderData = async (user, provider, id) => {
    const providerIdField = `${provider}Id`;
    
    if (!user[providerIdField]) {
        user[providerIdField] = id;
        await user.save();
    }
    
    return user;
};

// =============================================================================
// SESSION MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Performs session cleanup and management
 * @param {string} userId - User ID for session management
 * @returns {Promise<void>}
 */
const performSessionCleanup = async (userId) => {
    // Clean expired sessions if configured
    if (SESSION_CONFIG.CLEANUP_EXPIRED_ON_LOGIN) {
        await Session.cleanExpiredSessions();
    }
    
    // Limit active sessions per user
    await Session.deactivateOldSessions(userId, SESSION_CONFIG.MAX_SESSIONS_PER_USER);
};

/**
 * Creates a new session for the user
 * @param {string} userId - User ID
 * @param {string} accessToken - Generated access token
 * @param {string} refreshToken - Generated refresh token
 * @param {string} provider - OAuth provider name
 * @param {Object} deviceInfo - Device information object
 * @returns {Promise<Object>} Created session object
 */
const createUserSession = async (userId, accessToken, refreshToken, provider, deviceInfo) => {
    const sessionData = {
        userId,
        refreshToken,
        accessToken,
        provider,
        deviceInfo,
        expiresAt: calculateExpiryDate(SESSION_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS),
        isActive: true,
        lastUsed: new Date()
    };
    
    return await Session.create(sessionData);
};

/**
 * Extracts device information from the request
 * @param {Request} req - Express request object
 * @returns {Object} Device information object
 */
const extractDeviceInfo = (req) => {
    return {
        userAgent: req.headers["user-agent"] || 'Unknown',
        ip: req.ip || req.connection.remoteAddress || 'Unknown'
    };
};

/**
 * Calculates expiry date for tokens
 * @param {number} days - Number of days from now
 * @returns {Date} Expiry date
 */
const calculateExpiryDate = (days) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
};

/**
 * Sets secure cookies with appropriate options
 * @param {Response} res - Express response object
 * @param {string} accessToken - Access token to set
 * @param {string} refreshToken - Refresh token to set
 */
const setSecureCookies = (res, accessToken, refreshToken) => {
    const accessTokenOptions = {
        ...COOKIE_CONFIG,
        maxAge: SESSION_CONFIG.ACCESS_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    };

    const refreshTokenOptions = {
        ...COOKIE_CONFIG,
        maxAge: SESSION_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    };

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);
};

/**
 * Handles redirect after successful login
 * @param {Response} res - Express response object
 * @param {string} provider - OAuth provider name
 */
const handleSuccessRedirect = (res, provider) => {
    const redirectUrl = `${CLIENT_URL}/dashboard?login=success&provider=${provider}`;
    res.redirect(redirectUrl);
};

/**
 * Handles redirect after login failure
 * @param {Response} res - Express response object
 * @param {string} errorType - Type of error that occurred
 * @param {string} provider - OAuth provider name
 */
const handleErrorRedirect = (res, errorType = 'login_failed', provider) => {
    const redirectUrl = `${CLIENT_URL}?error=${errorType}&provider=${provider}`;
    res.redirect(redirectUrl);
};
// =============================================================================
// MAIN AUTHENTICATION FUNCTION
// =============================================================================

/**
 * Handles user login or creation from OAuth providers
 * @param {Object} params - Authentication parameters
 * @param {string} params.provider - OAuth provider name (google, github, linkedin)
 * @param {string} params.id - Provider-specific user ID
 * @param {string} params.email - User email address
 * @param {string} params.name - User display name
 * @param {string} params.avatar - User avatar URL
 * @param {Request} params.req - Express request object
 * @param {Response} params.res - Express response object
 * @returns {Promise<void>} Redirects user to appropriate page
 */
export const loginOrCreateUser = async ({ provider, id, email, name, avatar, req, res }) => {
    try {
        // Input validation
        if (!provider || !id || !email) {
            console.error('Missing required parameters:', { provider, id, email: !!email });
            return handleErrorRedirect(res, 'invalid_input', provider);
        }

        console.log(`Starting ${provider} OAuth flow for user:`, { id, email, name });

        // Step 1: Find or create user
        let user = await findExistingUser(provider, id, email);
        
        if (!user) {
            console.log('Creating new user for', provider);
            user = await createNewUser(provider, id, email, name, avatar);
        } else {
            console.log('Updating existing user for', provider);
            user = await updateUserProviderData(user, provider, id);
        }
        
        // Update login info for both new and existing users
        await user.updateLoginInfo();

        // Step 2: Session management
        await performSessionCleanup(user._id);

        // Step 3: Generate new tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // Step 4: Create new session
        const deviceInfo = extractDeviceInfo(req);
        await createUserSession(user._id, accessToken, refreshToken, provider, deviceInfo);

        // Step 5: Set secure cookies
        setSecureCookies(res, accessToken, refreshToken);

        // Step 6: Success redirect
        console.log(`${provider} OAuth successful for user:`, user._id);
        handleSuccessRedirect(res, provider);

    } catch (error) {
        // Comprehensive error logging
        console.error('Error in loginOrCreateUser:', {
            message: error.message,
            stack: error.stack,
            provider,
            email,
            userId: error.userId || 'unknown'
        });

        // Handle specific error types
        if (error.code === 11000) {
            // Duplicate key error (email already exists)
            console.error('Duplicate email detected:', email);
            return handleErrorRedirect(res, 'email_exists', provider);
        }

        if (error.name === 'ValidationError') {
            console.error('User validation failed:', error.errors);
            return handleErrorRedirect(res, 'validation_failed', provider);
        }

        // Generic error handling
        handleErrorRedirect(res, 'login_failed', provider);
    }
};
    