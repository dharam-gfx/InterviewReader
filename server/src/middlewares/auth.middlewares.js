import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/Token.js';
import User from "../models/User.model.js";
import Session from "../models/Session.model.js";

// =============================================================================
// AUTHENTICATION MIDDLEWARE CONFIGURATION
// =============================================================================

const AUTH_CONFIG = {
    TOKEN_SOURCES: ['cookies', 'headers'],
    SESSION_VALIDATION: true,
    USER_FIELDS_TO_EXCLUDE: '-__v',
    UPDATE_LAST_USED: true
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extracts access token from request (cookies or headers)
 * @param {Request} req - Express request object
 * @returns {string|null} Access token or null if not found
 */
const extractAccessToken = (req) => {
    // Try cookies first
    let token = req.cookies?.accessToken;
    
    // If not in cookies, try Authorization header
    if (!token && req.headers?.authorization) {
        token = extractTokenFromHeader(req.headers.authorization);
    }
    
    return token || null;
};

/**
 * Validates user session if session validation is enabled
 * @param {string} userId - User ID
 * @param {string} accessToken - Access token to validate
 * @returns {Promise<boolean>} True if session is valid
 */
const validateUserSession = async (userId, accessToken) => {
    if (!AUTH_CONFIG.SESSION_VALIDATION) {
        return true; // Skip validation if disabled
    }
    
    try {
        const session = await Session.findOne({
            userId,
            accessToken,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });
        
        if (!session) {
            return false;
        }
        
        // Update last used timestamp if configured
        if (AUTH_CONFIG.UPDATE_LAST_USED) {
            session.lastUsed = new Date();
            await session.save();
        }
        
        return true;
    } catch (error) {
        console.error('Session validation error:', error.message);
        return false;
    }
};

/**
 * Handles different types of authentication errors
 * @param {Error} error - Error object
 * @returns {ApiError} Formatted API error
 */
const handleAuthError = (error) => {
    const errorMap = {
        'TokenExpiredError': {
            status: 401,
            message: "Access token has expired",
            details: { auth: "Token expired" }
        },
        'JsonWebTokenError': {
            status: 401,
            message: "Invalid access token",
            details: { auth: "Invalid token format" }
        },
        'NotBeforeError': {
            status: 401,
            message: "Token not active yet",
            details: { auth: "Token not yet valid" }
        }
    };
    
    const errorInfo = errorMap[error.name] || {
        status: 401,
        message: "Authentication failed",
        details: { auth: error.message }
    };
    
    return new ApiError(errorInfo.status, errorInfo.message, errorInfo.details);
};

// =============================================================================
// MAIN AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * JWT Authentication Middleware
 * Verifies access token and attaches user to request
 */
const verifyJwtToken = asyncHandler(async (req, res, next) => {
    try {
        // Step 1: Extract access token
        const accessToken = extractAccessToken(req);
        
        if (!accessToken) {
            throw new ApiError(401, "Access token required", { 
                auth: "No access token provided in cookies or headers" 
            });
        }
        
        // Step 2: Verify and decode token
        let decodedToken;
        try {
            decodedToken = verifyAccessToken(accessToken);
        } catch (tokenError) {
            throw handleAuthError(tokenError);
        }
        
        // Step 3: Find user by ID
        const user = await User.findById(decodedToken._id)
            .select(AUTH_CONFIG.USER_FIELDS_TO_EXCLUDE);

        if (!user) {
            throw new ApiError(401, "User not found", { 
                auth: "User associated with token does not exist" 
            });
        }
        
        // Step 4: Check if user is active
        if (!user.isActive) {
            throw new ApiError(401, "Account is deactivated", { 
                auth: "User account has been deactivated" 
            });
        }
        
        // Step 5: Validate session (if enabled)
        const sessionValid = await validateUserSession(user._id, accessToken);
        if (!sessionValid) {
            throw new ApiError(401, "Invalid session", { 
                auth: "Session has expired or is invalid" 
            });
        }
        
        // Step 6: Attach user and token info to request
        req.user = user;
        req.tokenInfo = {
            accessToken,
            userId: decodedToken._id,
            tokenType: decodedToken.type,
            issuedAt: decodedToken.iat,
            expiresAt: decodedToken.exp
        };
        
        // Log successful authentication (in development)
        if (process.env.NODE_ENV === 'development') {
            console.log(`✅ User authenticated: ${user.email} (${user._id})`);
        }
        
        next();
        
    } catch (error) {
        // Ensure error is an ApiError
        if (!(error instanceof ApiError)) {
            console.error('Unexpected auth middleware error:', error);
            error = new ApiError(401, "Authentication failed", { 
                auth: "Internal authentication error" 
            });
        }
        
        next(error);
    }
});

// =============================================================================
// OPTIONAL AUTHENTICATION MIDDLEWARE
// =============================================================================

/**
 * Optional JWT Authentication Middleware
 * Verifies token if present, but doesn't fail if missing
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        const accessToken = extractAccessToken(req);
        
        if (!accessToken) {
            // No token provided, continue without authentication
            return next();
        }
        
        // Token provided, try to authenticate
        const decodedToken = verifyAccessToken(accessToken);
        const user = await User.findById(decodedToken._id)
            .select(AUTH_CONFIG.USER_FIELDS_TO_EXCLUDE);
        
        if (user && user.isActive) {
            const sessionValid = await validateUserSession(user._id, accessToken);
            if (sessionValid) {
                req.user = user;
                req.tokenInfo = {
                    accessToken,
                    userId: decodedToken._id,
                    tokenType: decodedToken.type,
                    issuedAt: decodedToken.iat,
                    expiresAt: decodedToken.exp
                };
            }
        }
        
        next();
        
    } catch (error) {
        // For optional auth, we don't fail on token errors
        console.log('Optional auth failed (continuing):', error.message);
        next();
    }
});

// =============================================================================
// ROLE-BASED AUTHENTICATION
// =============================================================================

/**
 * Creates middleware to check for specific user roles
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRoles = (allowedRoles = []) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, "Authentication required", { 
                auth: "Must be authenticated to access this resource" 
            });
        }
        
        // For future implementation when roles are added to User model
        const userRoles = req.user.roles || ['user'];
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
        
        if (!hasRequiredRole) {
            throw new ApiError(403, "Insufficient permissions", { 
                auth: `Requires one of: ${allowedRoles.join(', ')}` 
            });
        }
        
        next();
    });
};

// =============================================================================
// EXPORTS
// =============================================================================

export { 
    verifyJwtToken,
    optionalAuth,
    requireRoles,
    extractAccessToken,
    validateUserSession
};