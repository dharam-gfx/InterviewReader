import mongoose  from "mongoose";
import { DB_NAME } from "../constants.js";

/**
 * Connects to the MongoDB database using the provided URI and database name.
 * Logs the successful connection and exits the process if the connection fails.
 *
 * @return {Promise<void>} A promise that resolves when the database connection is established.
 */
const mongosDBconnection = async () => {
    try {
        const connectionResponse = await mongoose.connect( `${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log( "MongoDB connected successfully Host::", connectionResponse.connection.host );
    } catch ( error ) {
        console.log( "Error:: MongoDB connection failed", error );
        process.exit( 1 );
    }
}

export default mongosDBconnection;