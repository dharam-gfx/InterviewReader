import Session from "../models/Session.model.js";
import User from "../models/User.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Session service layer for handling session-related business logic
 */
class SessionService {
    /**
     * Get all active sessions for a user
     * @param {string} userId - User ID
     * @returns {Array} Array of active sessions
     */
    static async getUserActiveSessions(userId) {
        return await Session.find({
            userId,
            isActive: true
        }).select('provider deviceInfo lastUsed createdAt').sort({ lastUsed: -1 });
    }

    /**
     * Get session statistics for a user
     * @param {string} userId - User ID
     * @returns {Object} Session statistics
     */
    static async getSessionStats(userId) {
        const [activeSessions, totalSessions, providerStats] = await Promise.all([
            Session.countDocuments({ userId, isActive: true }),
            Session.countDocuments({ userId }),
            Session.aggregate([
                { $match: { userId } },
                { $group: { _id: "$provider", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        return {
            activeSessions,
            totalSessions,
            providerBreakdown: providerStats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        };
    }

    /**
     * Invalidate a specific session
     * @param {string} userId - User ID
     * @param {string} sessionId - Session ID to invalidate
     * @returns {Object} Success response
     */
    static async invalidateSession(userId, sessionId) {
        const session = await Session.findOneAndUpdate(
            { _id: sessionId, userId },
            { isActive: false, loggedOutAt: new Date() },
            { new: true }
        );

        if (!session) {
            throw new ApiError(404, "Session not found");
        }

        return { sessionId, invalidatedAt: session.loggedOutAt };
    }

    /**
     * Invalidate all sessions except current one and update login count
     * @param {string} userId - User ID
     * @param {string} currentAccessToken - Current session access token to preserve
     * @returns {Object} Success response with count
     */
    static async invalidateAllOtherSessions(userId, currentAccessToken) {
        const result = await Session.updateMany(
            { 
                userId, 
                isActive: true,
                accessToken: { $ne: currentAccessToken }
            },
            { 
                isActive: false, 
                loggedOutAt: new Date() 
            }
        );

        // Update user's login count based on remaining active sessions
        if (result.modifiedCount > 0) {
            const user = await User.findById(userId);
            if (user) {
                // Set login count to 1 (current session)
                user.loginCount = 1;
                await user.save();
            }
        }

        return { 
            invalidatedSessions: result.modifiedCount,
            currentSessionPreserved: true
        };
    }

    /**
     * Clean up expired sessions
     * @param {number} daysOld - Sessions older than this many days will be cleaned
     * @returns {Object} Cleanup statistics
     */
    static async cleanupExpiredSessions(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await Session.deleteMany({
            $or: [
                { isActive: false, loggedOutAt: { $lt: cutoffDate } },
                { lastUsed: { $lt: cutoffDate } }
            ]
        });

        return { deletedSessions: result.deletedCount };
    }
}

export default SessionService;
