import { body, param, query, validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

/**
 * Validation service for handling input validation
 */
class ValidationService {
    /**
     * Handle validation errors from express-validator
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     * @param {Function} next - Express next function
     */
    static handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }));
            
            throw new ApiError(400, "Validation failed", errorMessages);
        }
        next();
    }

    /**
     * User profile update validation rules
     */
    static validateUserProfileUpdate = [
        body('name')
            .optional()
            .isString()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Name must be between 2 and 50 characters'),
        
        body('skills')
            .optional()
            .isArray()
            .withMessage('Skills must be an array')
            .custom((skills) => {
                if (skills.length > 20) {
                    throw new Error('Maximum 20 skills allowed');
                }
                return skills.every(skill => 
                    typeof skill === 'string' && skill.trim().length > 0
                );
            })
            .withMessage('Each skill must be a non-empty string'),
        
        body('currentCompany')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 100 })
            .withMessage('Company name must not exceed 100 characters'),
        
        body('totalExperience')
            .optional()
            .isNumeric()
            .isFloat({ min: 0, max: 50 })
            .withMessage('Experience must be between 0 and 50 years'),
        
        ValidationService.handleValidationErrors
    ];

    /**
     * Bookmark validation rules
     */
    static validateBookmark = [
        body('interviewExperienceId')
            .isMongoId()
            .withMessage('Invalid interview experience ID'),
        
        ValidationService.handleValidationErrors
    ];

    /**
     * Session ID validation rules
     */
    static validateSessionId = [
        param('sessionId')
            .isMongoId()
            .withMessage('Invalid session ID'),
        
        ValidationService.handleValidationErrors
    ];

    /**
     * Pagination validation rules
     */
    static validatePagination = [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer'),
        
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100'),
        
        ValidationService.handleValidationErrors
    ];

    /**
     * MongoDB ObjectId validation
     */
    static validateObjectId = [
        param('interviewExperienceId')
            .isMongoId()
            .withMessage('Invalid ID format'),
        
        ValidationService.handleValidationErrors
    ];
}

export default ValidationService;
