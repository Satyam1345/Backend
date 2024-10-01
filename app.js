import express from "express"
import cors from "cors" 
import cookieParser from "cookie-parser"

const app = express()
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true 
}))

// TO TAKE JSON DATA
app.use(express.json({limit : "32kb"}))

// TO TAKE DATA FROM  URL's
app.use(express.urlencoded({
    extended : true,
limit : "32kb"
}));
// OR
// app.use(express.urlencoded()) ;

app.use(express.static("public"))
app.use(cookieParser())


// ROUTER IMPORT
import userRouter from './src/routes/user.routes.js' 

// Routes Decleration
app.use("/api/v1/users" , userRouter)

//  http://localhost:8000/api/v1/users/register

export {app} 