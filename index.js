// import mongoose from "mongoose" ;
// import {DB_NAME} from "./src/constants.js" ;
// import connectDB from "./src/db/index.js";
// import express from "express" ;
import dotenv from 'dotenv';
import connectDB from './src/db/index.js';
import {app} from "./app.js";
dotenv.config();
import express from 'express'; // Import express
// const app = express(); // Define the app instance

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db Connection Failed!!! ", err);
  });

/*
import express from "epress" ;
const app = express() ;

// function connectDB(){}
;( async() => {
    try{
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}/${DB_NAME}`)

       app.on("error" , (error) => {
        console.log("ERRR: ");
        throw error 
       })

       app.listen( process.env.PORT , ()=>{
        console.log(`App is listening on port ${process.env.PORT}` ) ;
    })
    }catch(error){
       console.error("ERROR: " , error )

    }
})()

*/
