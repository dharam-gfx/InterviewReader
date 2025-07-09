import 'dotenv/config';

const requiredEnvVars = [
    'PORT',
    'MONGODB_URI',
    'CLIENT_URL',
    'ACCESS_TOKEN_SECRET',
    'ACCESS_TOKEN_EXPIRY',
    'REFRESH_TOKEN_SECRET',
    'REFRESH_TOKEN_EXPIRY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_REDIRECT_URI',
    'LINKEDIN_CLIENT_ID',
    'LINKEDIN_CLIENT_SECRET',
    'LINKEDIN_REDIRECT_URI'
];

export const validateEnvironment = () => {
    const missingVars = [];
    const invalidVars = [];

    for (const envVar of requiredEnvVars) {
        const value = process.env[envVar];
        
        if (!value) {
            missingVars.push(envVar);
        } else if (value.includes('your_') || value === 'your_google_client_id') {
            invalidVars.push(envVar);
        }
    }

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    if (invalidVars.length > 0) {
        throw new Error(`Invalid placeholder values in environment variables: ${invalidVars.join(', ')}`);
    }

    // Validate JWT secrets length
    if (process.env.ACCESS_TOKEN_SECRET.length < 32) {
        throw new Error('ACCESS_TOKEN_SECRET must be at least 32 characters long');
    }

    if (process.env.REFRESH_TOKEN_SECRET.length < 32) {
        throw new Error('REFRESH_TOKEN_SECRET must be at least 32 characters long');
    }

    // Validate URLs
    try {
        new URL(process.env.CLIENT_URL);
        new URL(process.env.GOOGLE_REDIRECT_URI);
        new URL(process.env.GITHUB_REDIRECT_URI);
        new URL(process.env.LINKEDIN_REDIRECT_URI);
    } catch (urlError) {
        throw new Error(`Invalid URL format in environment variables: ${urlError.message}`);
    }

    console.log('✅ Environment variables validated successfully');
};

export const getEnvironment = () => {
    return process.env.NODE_ENV || 'development';
};

export const isDevelopment = () => getEnvironment() === 'development';
export const isProduction = () => getEnvironment() === 'production';
