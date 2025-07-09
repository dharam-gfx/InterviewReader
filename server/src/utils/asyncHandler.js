/**
 * asyncHandler is a higher-order function that wraps asynchronous route handlers
 * or middleware in a try-catch block to automatically catch and forward errors
 * to the next middleware function, ensuring proper error handling in Express.js.
 *
 ** Purpose: asyncHandler is designed to wrap async route handlers and middleware in Express.js applications. By doing so, it automatically catches any rejected promises (errors) and forwards them to the next error-handling middleware using next(error).
 * 
 * @param {Function} fn - The asynchronous function (route handler or middleware)
 *                         that needs to be wrapped.
 * @returns {Function} - A function that returns a Promise which, when resolved,
 *                       calls the provided function, and catches any errors,
 *                       passing them to the next middleware.
 */
const asyncHandler = ( fn ) => ( req, res, next ) => (
    Promise.resolve( fn( req, res, next ) ).catch( ( error ) => next( error ) )
);

export { asyncHandler };

/**
 * asyncHandler2 is an async function wrapper that executes asynchronous route
 * handlers and middleware with proper error handling. It uses try-catch blocks
 * to catch exceptions and sends a structured JSON response if an error occurs.
 **Purpose: asyncHandler2 is another pattern for wrapping async route handlers or middleware, similar to asyncHandler. However, instead of forwarding errors to the next middleware, it directly sends a JSON response with error details.
 *
 * @param {Function} fn - The asynchronous function (route handler or middleware)
 *                         that needs to be wrapped.
 * @returns {Function} - An asynchronous function that executes the provided
 *                       function and handles errors by sending a JSON response
 *                       with error details.

const asyncHandler2 = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message || 'Internal Server Error',
        });
    }
};

//? Sample async route handler
const getUser = async (req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) {
        throw { code: 404, message: 'User not found' };
    }
    res.json(user);
};
//* Using asyncHandler to wrap the route
app.get('/users/:id', asyncHandler(getUser));

 */



