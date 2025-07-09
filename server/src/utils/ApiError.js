class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        data = {},
        error = {},
        stack = ""
    ) {
        super( message );
        this.statusCode = statusCode;
        this.message = message;
        this.errors = data;
        this.error = error;
        this.success = false;
        if ( stack ) {
            this.stack = stack;
        } else {
            Error.captureStackTrace( this, this.constructor );
        }
    }
}

export { ApiError };



/**
 ** Error code MDN - https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 * Error code list image URL https://restfulapi.net/wp-content/uploads/HTTP-Error-Codes.jpg 
 * ApiResponse is a class used to standardize the response object sent back to the client.
 * It is used to wrap the response data and metadata in a consistent format.
 * This class allows us to pass consistent response messages to the client.
 * It also allows us to customize the response by adding additional information to the response object.
 * For example, we can add a statusCode and success property to the response object to indicate the status of the request.
 * We can also add a message property to the response object to include a descriptive message with the response.
 * This class simplifies the process of sending responses from the server to the client.
 * It provides a consistent way to send responses with a status code, success property, and message property.
 * This makes it easier to create consistent responses for different types of requests.
 */