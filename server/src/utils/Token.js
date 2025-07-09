import jwt from 'jsonwebtoken';

// =============================================================================
// TOKEN CONFIGURATION
// =============================================================================

const TOKEN_CONFIG = {
    ACCESS_TOKEN: {
        ALGORITHM: 'HS256',
        ISSUER: 'InterviewReader',
        AUDIENCE: 'InterviewReader-Users'
    },
    REFRESH_TOKEN: {
        ALGORITHM: 'HS256',
        ISSUER: 'InterviewReader',
        AUDIENCE: 'InterviewReader-Users'
    }
};

// =============================================================================
// TOKEN GENERATION FUNCTIONS
// =============================================================================

/**
 * Generates access token with user payload
 * @param {string} userId - User ID to include in token
 * @param {Object} additionalPayload - Additional data to include (optional)
 * @returns {string} Signed access token
 */
export const generateAccessToken = (userId, additionalPayload = {}) => {
    if (!userId) {
        throw new Error('User ID is required for token generation');
    }

    const payload = {
        _id: userId,
        type: 'access',
        ...additionalPayload
    };

    const options = {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d',
        algorithm: TOKEN_CONFIG.ACCESS_TOKEN.ALGORITHM,
        issuer: TOKEN_CONFIG.ACCESS_TOKEN.ISSUER,
        audience: TOKEN_CONFIG.ACCESS_TOKEN.AUDIENCE
    };

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, options);
};

/**
 * Generates refresh token with user payload
 * @param {string} userId - User ID to include in token
 * @param {Object} additionalPayload - Additional data to include (optional)
 * @returns {string} Signed refresh token
 */
export const generateRefreshToken = (userId, additionalPayload = {}) => {
    if (!userId) {
        throw new Error('User ID is required for token generation');
    }

    const payload = {
        _id: userId,
        type: 'refresh',
        ...additionalPayload
    };

    const options = {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d',
        algorithm: TOKEN_CONFIG.REFRESH_TOKEN.ALGORITHM,
        issuer: TOKEN_CONFIG.REFRESH_TOKEN.ISSUER,
        audience: TOKEN_CONFIG.REFRESH_TOKEN.AUDIENCE
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, options);
};

/**
 * Generates both access and refresh tokens
 * @param {string} userId - User ID to include in tokens
 * @param {Object} additionalPayload - Additional data to include (optional)
 * @returns {Object} Object containing both tokens
 */
export const generateTokens = (userId, additionalPayload = {}) => {
    try {
        const accessToken = generateAccessToken(userId, additionalPayload);
        const refreshToken = generateRefreshToken(userId, additionalPayload);

        return { accessToken, refreshToken };
    } catch (error) {
        console.error('Error generating tokens:', error.message);
        throw new Error('Failed to generate authentication tokens');
    }
};

// =============================================================================
// TOKEN VERIFICATION FUNCTIONS
// =============================================================================

/**
 * Verifies and decodes an access token
 * @param {string} token - Token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyAccessToken = (token) => {
    try {
        const options = {
            algorithms: [TOKEN_CONFIG.ACCESS_TOKEN.ALGORITHM],
            issuer: TOKEN_CONFIG.ACCESS_TOKEN.ISSUER,
            audience: TOKEN_CONFIG.ACCESS_TOKEN.AUDIENCE
        };

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, options);
        
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Access token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid access token');
        } else {
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }
};

/**
 * Verifies and decodes a refresh token
 * @param {string} token - Token to verify
 * @returns {Object} Decoded token payload
 */
export const verifyRefreshToken = (token) => {
    try {
        const options = {
            algorithms: [TOKEN_CONFIG.REFRESH_TOKEN.ALGORITHM],
            issuer: TOKEN_CONFIG.REFRESH_TOKEN.ISSUER,
            audience: TOKEN_CONFIG.REFRESH_TOKEN.AUDIENCE
        };

        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, options);
        
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid refresh token');
        } else {
            throw new Error(`Token verification failed: ${error.message}`);
        }
    }
};

// =============================================================================
// TOKEN UTILITY FUNCTIONS
// =============================================================================

/**
 * Extracts token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
};

/**
 * Gets token expiry time in seconds
 * @param {string} token - JWT token
 * @returns {number|null} Expiry timestamp or null if invalid
 */
export const getTokenExpiry = (token) => {
    try {
        const decoded = jwt.decode(token);
        return decoded?.exp || null;
    } catch (error) {
        return null;
    }
};

/**
 * Checks if token is expired without verification
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    
    return Date.now() >= expiry * 1000;
};

/**
 * Gets time remaining until token expires (in milliseconds)
 * @param {string} token - JWT token
 * @returns {number} Milliseconds until expiry, 0 if expired
 */
export const getTimeUntilExpiry = (token) => {
    const expiry = getTokenExpiry(token);
    if (!expiry) return 0;
    
    const timeRemaining = (expiry * 1000) - Date.now();
    return Math.max(0, timeRemaining);
};