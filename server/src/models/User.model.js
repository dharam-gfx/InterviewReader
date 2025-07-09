import mongoose from "mongoose";

// =============================================================================
// USER SCHEMA DEFINITION
// =============================================================================

const userSchema = new mongoose.Schema({
    // Basic user information
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            "Please enter a valid email address"
        ],
        index: true
    },
    
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minLength: [2, "Name must be at least 2 characters long"],
        maxLength: [50, "Name cannot exceed 50 characters"]
    },
    
    avatar: {
        type: String,
        default: "",
        validate: {
            validator: function(v) {
                // Allow empty strings or valid URLs (including OAuth provider URLs without file extensions)
                return !v || /^https?:\/\/.+/.test(v);
            },
            message: "Avatar must be a valid URL"
        }
    },

    // OAuth provider IDs - for linking accounts
    googleId: {
        type: String,
        sparse: true, // Allows multiple null values
        index: true
    },
    
    githubId: {
        type: String,
        sparse: true,
        index: true
    },
    
    linkedinId: {
        type: String,
        sparse: true,
        index: true
    },

    // Professional information
    skills: {
        type: [String],
        default: [],
        validate: {
            validator: function(skills) {
                return skills.length <= 20; // Max 20 skills
            },
            message: "Cannot have more than 20 skills"
        }
    },
    
    currentCompany: {
        type: String,
        trim: true,
        maxLength: [100, "Company name cannot exceed 100 characters"]
    },
    
    totalExperience: {
        type: Number,
        min: [0, "Experience cannot be negative"],
        max: [50, "Experience cannot exceed 50 years"]
    },

    // User preferences and data
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "InterviewExperience"
    }],

    // Account status
    isActive: {
        type: Boolean,
        default: true
    },

    // Last login tracking
    lastLoginAt: {
        type: Date,
        default: Date.now
    },

    // Login count for analytics - tracks active sessions
    loginCount: {
        type: Number,
        default: 0,
        min: [0, "Login count cannot be negative"]
    }
}, {
    timestamps: true,
    // Add version key for optimistic locking
    versionKey: '__v'
});

// =============================================================================
// INDEXES FOR PERFORMANCE
// =============================================================================

// Compound index for OAuth provider searches
userSchema.index({ googleId: 1, githubId: 1, linkedinId: 1 });

// Index for active users
userSchema.index({ isActive: 1, lastLoginAt: -1 });

// Text index for searching users by name or skills
userSchema.index({ 
    name: 'text', 
    skills: 'text' 
}, {
    weights: { name: 10, skills: 5 }
});

// =============================================================================
// VIRTUAL FIELDS
// =============================================================================

// Virtual for full display info
userSchema.virtual('displayInfo').get(function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email,
        avatar: this.avatar,
        isActive: this.isActive
    };
});

// Virtual for OAuth providers
userSchema.virtual('connectedProviders').get(function() {
    const providers = [];
    if (this.googleId) providers.push('google');
    if (this.githubId) providers.push('github');
    if (this.linkedinId) providers.push('linkedin');
    return providers;
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * Update last login timestamp and increment active session count
 */
userSchema.methods.updateLoginInfo = function() {
    this.lastLoginAt = new Date();
    this.loginCount += 1;
    return this.save();
};

/**
 * Decrease active session count on logout
 */
userSchema.methods.decrementLoginCount = function() {
    if (this.loginCount > 0) {
        this.loginCount -= 1;
    }
    return this.save();
};

/**
 * Add a skill if not already present
 * @param {string} skill - Skill to add
 */
userSchema.methods.addSkill = function(skill) {
    if (skill && !this.skills.includes(skill)) {
        this.skills.push(skill);
    }
    return this;
};

/**
 * Remove a skill
 * @param {string} skill - Skill to remove
 */
userSchema.methods.removeSkill = function(skill) {
    this.skills = this.skills.filter(s => s !== skill);
    return this;
};

/**
 * Check if user has a specific OAuth provider linked
 * @param {string} provider - Provider name (google, github, linkedin)
 */
userSchema.methods.hasProvider = function(provider) {
    const field = `${provider}Id`;
    return Boolean(this[field]);
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * Find user by any OAuth provider ID
 * @param {string} provider - Provider name
 * @param {string} providerId - Provider-specific user ID
 */
userSchema.statics.findByProvider = function(provider, providerId) {
    const field = `${provider}Id`;
    return this.findOne({ [field]: providerId });
};

/**
 * Find users by skill
 * @param {string} skill - Skill to search for
 */
userSchema.statics.findBySkill = function(skill) {
    return this.find({ skills: { $in: [skill] } });
};

/**
 * Get active users count
 */
userSchema.statics.getActiveUsersCount = function() {
    return this.countDocuments({ isActive: true });
};

// =============================================================================
// MIDDLEWARE HOOKS
// =============================================================================

// Pre-save middleware to normalize email
userSchema.pre('save', function(next) {
    if (this.isModified('email')) {
        this.email = this.email.toLowerCase().trim();
    }
    next();
});

// Pre-save middleware to clean skills array
userSchema.pre('save', function(next) {
    if (this.isModified('skills')) {
        // Remove duplicates and empty strings
        this.skills = [...new Set(this.skills.filter(skill => skill && skill.trim()))];
    }
    next();
});

// =============================================================================
// JSON TRANSFORM
// =============================================================================

// Transform output when converting to JSON
userSchema.set('toJSON', {
    transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        // Remove sensitive OAuth IDs and other sensitive data
        delete ret.googleId;
        delete ret.githubId;
        delete ret.linkedinId;
        return ret;
    }
});

export default mongoose.model("User", userSchema);
