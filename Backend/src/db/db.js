import mongoose from "mongoose"
const DB_NAME = 'BuildX';

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI?.replace(/\/+$/, '');

        if (!mongoUri) {
            throw new Error('MONGO_URI environment variable is not configured');
        }

        const conn = await mongoose.connect(`${mongoUri}/${DB_NAME}`);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB