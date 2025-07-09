import 'dotenv/config';
import { validateEnvironment, getEnvironment } from './utils/env.js';
import mongosDBconnection from './db/index.js';
import {app} from "./app.js";

// Validate environment variables before starting
try {
    validateEnvironment();
} catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    process.exit(1);
}

const port = process.env.PORT || 4000;
const environment = getEnvironment();

console.log(`🚀 Starting server in ${environment} mode...`);

app.get( '/', ( req, res ) => {
    res.send( 'Hello World!' );
} );

// mongosDBconnection is a promise function
mongosDBconnection()
.then( () => {
    app.listen( port, () => {
        console.log( `⚙️ Server is running at port : ${port}` );
    } )
} )
.catch( ( err ) => {
        console.log( "MONGO db connection failed !!! ", err );
    } )

/*
method 2
import express from "express";
const app = express();

; ( async () => {
    try {
        await mongoose.connect( `${process.env.MONGODB_URI}/${DB_NAME}` );
        aap.on( 'error', ( error ) => {
            console.log( "Error:: ", error );
            throw error;
        } );

        app.listen( process.env.PORT, () => {
            console.log( `Server running on port ${process.env.PORT}` );
        } );

        console.log( "MongoDB connected successfully" );
    } catch ( error ) {
        console.log( "Error:: MongoDB connection failed", error );
        throw error;
    }
} )();
*/