import Session from "../models/Session.model.js";
import User from "../models/User.model.js";
import jwt from "jsonwebtoken";

/**
 * Helper function to clear authentication cookies
 */
const clearAuthCookies = (res) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    };
    
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);
};

/**
 * Helper function to get user ID from token
 */
const getUserIdFromToken = (accessToken) => {
    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        return decoded._id;
    } catch (error) {
        console.log('Token verification failed:', error.message);
        return null;
    }
};

/**
 * Helper function to delete session and update user login count
 */
const deleteSessionAndUpdateCount = async (refreshToken, userId) => {
    try {
        const deleteResult = await Session.deleteOne({ 
            refreshToken,
            isActive: true 
        });
        
        if (deleteResult.deletedCount > 0 && userId) {
            // Decrease login count when session is deleted
            const user = await User.findById(userId);
            if (user) {
                await user.decrementLoginCount();
            }
        }
        
        return deleteResult.deletedCount;
    } catch (error) {
        console.error('Error deleting session:', error.message);
        return 0;
    }
};

/**
 * Helper function to cleanup expired sessions
 */
const cleanupExpiredSessions = async (userId) => {
    try {
        const cleanupResult = await Session.deleteMany({
            userId,
            $or: [
                { expiresAt: { $lt: new Date() } },
                { isActive: false }
            ]
        });
        
        if (cleanupResult.deletedCount > 0) {
            console.log(`Cleaned up ${cleanupResult.deletedCount} expired sessions`);
        }
        
        return cleanupResult.deletedCount;
    } catch (error) {
        console.error('Error during session cleanup:', error.message);
        return 0;
    }
};

export const logout = async ( req, res ) => {
    try {
        const { refreshToken, accessToken } = req.cookies;
        
        // Clear cookies first
        clearAuthCookies(res);

        let deletedSessions = 0;
        const userId = getUserIdFromToken(accessToken);

        // Delete specific session if refresh token exists
        if ( refreshToken ) {
            deletedSessions = await deleteSessionAndUpdateCount(refreshToken, userId);
        }

        // Clean up expired sessions for this user
        if (userId) {
            await cleanupExpiredSessions(userId);
        }

        res.status( 200 ).json( { 
            message: "Logged out successfully",
            sessionsDeleted: deletedSessions,
            cleanupPerformed: Boolean(userId)
        } );
        
    } catch (error) {
        console.error('Logout error:', error.message);
        clearAuthCookies(res);
        
        res.status( 200 ).json( { 
            message: "Logged out (with cleanup errors)",
            error: "Some sessions could not be deleted, but cookies cleared"
        } );
    }
};

export const logoutAllDevices = async ( req, res ) => {
    try {
        const { refreshToken, accessToken } = req.cookies;
        let userId = null;

        // Get user ID from current session or token
        if (refreshToken) {
            try {
                const session = await Session.findOne({ refreshToken });
                userId = session?.userId;
            } catch (error) {
                console.log('Error finding session:', error.message);
            }
        }

        if (!userId && accessToken) {
            userId = getUserIdFromToken(accessToken);
        }

        // Clear cookies
        clearAuthCookies(res);

        let deletedCount = 0;
        if (userId) {
            try {
                const result = await Session.deleteMany({ userId });
                deletedCount = result.deletedCount;
                
                // Reset login count to 0 when logging out from all devices
                if (deletedCount > 0) {
                    const user = await User.findById(userId);
                    if (user) {
                        user.loginCount = 0;
                        await user.save();
                    }
                }
            } catch (error) {
                console.error('Error deleting all sessions:', error.message);
            }
        }

        res.status( 200 ).json( { 
            message: "Logged out from all devices",
            sessionsDeleted: deletedCount
        } );

    } catch (error) {
        console.error('Logout all devices error:', error.message);
        clearAuthCookies(res);
        
        res.status( 500 ).json( { 
            message: "Error during logout, but cookies cleared",
            error: error.message 
        } );
    }
};