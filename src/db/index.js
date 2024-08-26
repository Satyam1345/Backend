import mongoose, { mongo } from "mongoose"
import { DB_NAME } from "../constants.js"

import { TEST_CONSTANT } from './test.js'
console.log(TEST_CONSTANT)

const connectDB = async () => {
    try{
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       console.log(`\nMongoDB connected !! DB HOST : ${connectionInstance.connection.host}`)
    }catch(error){
        console.log("MONGODB connection error " , error) ;
        process.exit(1) ;
    }
}

export default connectDB;