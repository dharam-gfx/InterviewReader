import Session from "../models/Session.model.js";

// =============================================================================
// SESSION CLEANUP CONFIGURATION
// =============================================================================

const CLEANUP_CONFIG = {
    INTERVAL_HOURS: 1, // Run cleanup every hour
    BATCH_SIZE: 1000, // Process sessions in batches
    LOG_RESULTS: true, // Log cleanup results
    MAX_RETRY_ATTEMPTS: 3
};

// =============================================================================
// CLEANUP FUNCTIONS
// =============================================================================

/**
 * Clean up expired and inactive sessions with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<number>} Number of sessions deleted
 */
export const cleanupExpiredSessions = async (retryCount = 0) => {
    try {
        const startTime = Date.now();
        const result = await Session.cleanExpiredSessions();
        const duration = Date.now() - startTime;
        
        if (CLEANUP_CONFIG.LOG_RESULTS && result.deletedCount > 0) {
            console.log(`✅ Session cleanup completed: ${result.deletedCount} sessions deleted in ${duration}ms`);
        }
        
        return result.deletedCount;
    } catch (error) {
        console.error(`❌ Session cleanup error (attempt ${retryCount + 1}):`, error.message);
        
        // Retry logic
        if (retryCount < CLEANUP_CONFIG.MAX_RETRY_ATTEMPTS) {
            const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.log(`🔄 Retrying session cleanup in ${retryDelay}ms...`);
            
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return cleanupExpiredSessions(retryCount + 1);
        }
        
        console.error(`💥 Session cleanup failed after ${CLEANUP_CONFIG.MAX_RETRY_ATTEMPTS} attempts`);
        return 0;
    }
};

/**
 * Clean up sessions for a specific user
 * @param {string} userId - User ID to clean sessions for
 * @param {number} maxSessions - Maximum number of sessions to keep
 * @returns {Promise<number>} Number of sessions deactivated
 */
export const cleanupUserSessions = async (userId, maxSessions = 3) => {
    try {
        const activeSessions = await Session.getActiveSessions(userId);
        
        if (activeSessions.length <= maxSessions) {
            return 0; // No cleanup needed
        }
        
        // Sort by lastUsed (oldest first) and deactivate excess sessions
        const sessionsToDeactivate = activeSessions
            .sort((a, b) => a.lastUsed - b.lastUsed)
            .slice(0, activeSessions.length - maxSessions);
        
        const sessionIds = sessionsToDeactivate.map(s => s._id);
        const result = await Session.updateMany(
            { _id: { $in: sessionIds } },
            { isActive: false }
        );
        
        console.log(`🧹 Deactivated ${result.modifiedCount} old sessions for user ${userId}`);
        return result.modifiedCount;
        
    } catch (error) {
        console.error(`Error cleaning user sessions for ${userId}:`, error.message);
        return 0;
    }
};

/**
 * Batch cleanup of sessions to avoid memory issues
 * @returns {Promise<Object>} Cleanup statistics
 */
export const batchCleanupSessions = async () => {
    try {
        const stats = {
            totalProcessed: 0,
            totalDeleted: 0,
            batches: 0,
            startTime: Date.now()
        };
        
        let hasMore = true;
        
        while (hasMore) {
            // Find expired sessions in batches
            const expiredSessions = await Session.find({
                $or: [
                    { expiresAt: { $lt: new Date() } },
                    { isActive: false }
                ]
            })
            .limit(CLEANUP_CONFIG.BATCH_SIZE)
            .select('_id');
            
            if (expiredSessions.length === 0) {
                hasMore = false;
                break;
            }
            
            // Delete batch
            const sessionIds = expiredSessions.map(s => s._id);
            const deleteResult = await Session.deleteMany({
                _id: { $in: sessionIds }
            });
            
            stats.totalProcessed += expiredSessions.length;
            stats.totalDeleted += deleteResult.deletedCount;
            stats.batches++;
            
            // Check if we processed less than batch size (last batch)
            if (expiredSessions.length < CLEANUP_CONFIG.BATCH_SIZE) {
                hasMore = false;
            }
        }
        
        stats.duration = Date.now() - stats.startTime;
        
        if (CLEANUP_CONFIG.LOG_RESULTS && stats.totalDeleted > 0) {
            console.log(`📊 Batch cleanup completed:`, {
                deleted: stats.totalDeleted,
                batches: stats.batches,
                duration: `${stats.duration}ms`
            });
        }
        
        return stats;
        
    } catch (error) {
        console.error('Batch cleanup error:', error.message);
        return { error: error.message };
    }
};

// =============================================================================
// PERIODIC CLEANUP MANAGEMENT
// =============================================================================

let cleanupInterval = null;

/**
 * Start periodic session cleanup
 * @param {number} intervalHours - Cleanup interval in hours
 */
export const startSessionCleanup = (intervalHours = CLEANUP_CONFIG.INTERVAL_HOURS) => {
    if (cleanupInterval) {
        console.log('⚠️ Session cleanup already running');
        return;
    }
    
    console.log(`🔄 Starting periodic session cleanup (every ${intervalHours} hours)`);
    
    // Run cleanup immediately
    cleanupExpiredSessions().then(deletedCount => {
        console.log(`🚀 Initial session cleanup: ${deletedCount} sessions removed`);
    });
    
    // Schedule periodic cleanup
    cleanupInterval = setInterval(async () => {
        try {
            await cleanupExpiredSessions();
        } catch (error) {
            console.error('Periodic cleanup error:', error.message);
        }
    }, intervalHours * 60 * 60 * 1000);
    
    // Handle process termination
    process.on('SIGINT', stopSessionCleanup);
    process.on('SIGTERM', stopSessionCleanup);
};

/**
 * Stop periodic session cleanup
 */
export const stopSessionCleanup = () => {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        console.log('🛑 Session cleanup stopped');
    }
};

// =============================================================================
// SESSION ANALYTICS
// =============================================================================

/**
 * Get comprehensive session statistics
 * @returns {Promise<Object>} Session statistics
 */
export const getSessionStats = async () => {
    try {
        const stats = await Session.getSessionStats();
        
        // Add additional metrics
        const now = new Date();
        const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        
        const recentSessions = await Session.countDocuments({
            createdAt: { $gte: oneDayAgo }
        });
        
        const weeklySessions = await Session.countDocuments({
            createdAt: { $gte: oneWeekAgo }
        });
        
        // Provider breakdown
        const providerStats = await Session.aggregate([
            { $match: { isActive: true, expiresAt: { $gt: now } } },
            { $group: { _id: '$provider', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        return {
            ...stats,
            recentSessions: {
                last24Hours: recentSessions,
                lastWeek: weeklySessions
            },
            byProvider: providerStats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            generatedAt: now
        };
        
    } catch (error) {
        console.error('Error getting session stats:', error.message);
        return { error: error.message };
    }
};

/**
 * Get session statistics for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User session statistics
 */
export const getUserSessionStats = async (userId) => {
    try {
        const activeSessions = await Session.getActiveSessions(userId);
        const totalSessions = await Session.countDocuments({ userId });
        
        return {
            userId,
            activeSessions: activeSessions.length,
            totalSessions,
            sessions: activeSessions.map(session => ({
                id: session._id,
                provider: session.provider,
                deviceInfo: session.deviceInfo,
                lastUsed: session.lastUsed,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt
            }))
        };
        
    } catch (error) {
        console.error(`Error getting session stats for user ${userId}:`, error.message);
        return { error: error.message };
    }
};
