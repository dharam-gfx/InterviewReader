class ApiResponse {
    constructor( statusCode, message = "success" ,data = null ) {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode >= 200 && statusCode < 300;
    }

    /**
     * Returns the response object with the status code, data, message, and success property.
     * @returns {Object} - The response object.
     */
    get response() {
        // Return the response object with the status code, data, message, and success property.
        return {
            statusCode: this.statusCode, 
            data: this.data,
            message: this.message, 
            success: this.success
        };
    }
}

export { ApiResponse }
