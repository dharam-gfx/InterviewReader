const ErrorHandler = ( err, req, res, next ) => {
    console.log( "Middleware Error Hadnling", err );
    res.status( err.statusCode || 500 ).json( {
        success: false,
        status: err.statusCode || 500,
        message: err.message || 'Something went wrong',
        errors: err.errors || {},
        stack: process.env.NODE_ENV === 'development' ? err.stack : {}
    } )
}

export { ErrorHandler }