import 'dotenv/config';
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import { URL_LEN_CODED_LIMIT, JSON_LIMIT } from "./constants.js";

const app = express();

// Security Headers
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// OAuth specific rate limiting
const oauthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 OAuth attempts per windowMs
    message: {
        error: "Too many OAuth attempts, please try again later."
    },
});
app.use('/auth', oauthLimiter);

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

/** 
 * Here we are configuring express.
 *We are setting up cors to allow requests from the client's origin.
 *This is necessary for Cross-Origin Resource Sharing (CORS).
 *We are also setting credentials to true so that we can share cookies.
 *This is necessary for authentication and session management.
**/
app.use( cors( {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204
} ) );

// We are setting the limit for incoming JSON data. This prevents large JSON payloads from crashing the server.
// This is useful for preventing denial-of-service attacks that rely on large payloads.
app.use( express.json( { limit: JSON_LIMIT } ) );

// We are setting the limit for incoming URL-encoded data. This prevents large forms or data from crashing the server.
// This is useful for preventing denial-of-service attacks that rely on large data payloads.
app.use( express.urlencoded( { extended: true, limit: URL_LEN_CODED_LIMIT } ) );

// We are using cookie-parser to parse cookies. This is necessary for session management and authentication.
app.use( cookieParser() );

// We are using express.static to serve static files such as images, CSS files, and JavaScript files.
app.use( express.static( 'public' ) );

//*****************  routes  ***********************
import userRoutes from './routes/userRoutes.js'
import { ErrorHandler } from "./middlewares/ErrorHandler.middlewares.js";
app.use( '/api/v1/user', userRoutes );

// Auth routes
import authRoutes from './routes/authRoutes.js';
app.use( '/auth', authRoutes );

// Start session cleanup (only in production or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SESSION_CLEANUP === 'true') {
    import('./utils/sessionCleanup.js').then(({ startSessionCleanup }) => {
        startSessionCleanup();
    }).catch(error => {
        console.error('Failed to start session cleanup:', error);
    });
}

// ErrorHandler.js
app.use( ErrorHandler )

export { app }