import mongoose from "mongoose";

const interviewExperienceSchema = new mongoose.Schema( {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    company: {
        type: String,
        required: true,
        index: true
    },

    location: {
        type: String
    },

    yearsOfExperience: {
        type: Number,
        required: true,
        index: true
    },

    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard"],
        required: true,
        index: true
    },

    interviewDate: {
        type: Date,
        required: true,
        index: true
    },

    package: {
        type: String // e.g., "15 LPA", "$130K", etc.
    },

    content: {
        type: String, // Markdown string
        required: true
    },

    tags: {
        type: [String],
        default: [],
        index: true
    },
    // Only login user can like the interview experience
    likes: {
        type: Number,
        default: 0
    },
    // when user views or read the interview experience
    views: {
        type: Number,
        default: 0
    },

}, {
    timestamps: true
} );

export default mongoose.model( "InterviewExperience", interviewExperienceSchema );