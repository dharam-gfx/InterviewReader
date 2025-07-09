import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
    {
        userId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: true,
            index: true // Index for faster queries
        },
        refreshToken: { 
            type: String, 
            required: true,
            unique: true,
            index: true
        },
        accessToken: {
            type: String,
            required: true
        },
        provider: {
            type: String,
            required: true,
            enum: ["google", "github", "linkedin"]
        },
        deviceInfo: {
            userAgent: String,
            ip: String
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true
        },
        lastUsed: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expireAfterSeconds: 0 } // Auto-delete expired sessions
        }
    },
    {
        timestamps: true
    }
);

// Compound index for user + active sessions
sessionSchema.index({ userId: 1, isActive: 1 });

// Index for cleanup operations
sessionSchema.index({ expiresAt: 1, isActive: 1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

// Static method to clean up expired/inactive sessions
sessionSchema.statics.cleanExpiredSessions = async function() {
    const result = await this.deleteMany({ 
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false }
        ]
    });
    
    if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired sessions`);
    }
    
    return result;
};

// Static method to get active sessions for a user
sessionSchema.statics.getActiveSessions = async function(userId) {
    return this.find({ 
        userId, 
        isActive: true, 
        expiresAt: { $gt: new Date() } 
    }).sort({ lastUsed: -1 });
};

// Static method to get session statistics
sessionSchema.statics.getSessionStats = async function() {
    const pipeline = [
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                activeSessions: {
                    $sum: {
                        $cond: [
                            { 
                                $and: [
                                    { $eq: ["$isActive", true] },
                                    { $gt: ["$expiresAt", new Date()] }
                                ]
                            }, 
                            1, 
                            0
                        ]
                    }
                },
                expiredSessions: {
                    $sum: {
                        $cond: [{ $lt: ["$expiresAt", new Date()] }, 1, 0]
                    }
                },
                inactiveSessions: {
                    $sum: {
                        $cond: [{ $eq: ["$isActive", false] }, 1, 0]
                    }
                }
            }
        }
    ];
    
    const result = await this.aggregate(pipeline);
    return result[0] || {
        totalSessions: 0,
        activeSessions: 0,
        expiredSessions: 0,
        inactiveSessions: 0
    };
};

// Static method to deactivate old sessions (instead of deleting)
sessionSchema.statics.deactivateOldSessions = async function(userId, maxSessions = 3) {
    const sessions = await this.getActiveSessions(userId);
    
    if (sessions.length >= maxSessions) {
        const sessionsToDeactivate = sessions.slice(maxSessions - 1);
        await this.updateMany(
            { _id: { $in: sessionsToDeactivate.map(s => s._id) } },
            { isActive: false }
        );
    }
};

export default mongoose.model( "Session", sessionSchema );
