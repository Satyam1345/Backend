import mongoose , {Schema} from "mongoose";

import  jwt from "jsonwebtoken";
import bcrypt from "bcrypt" ;


const userSchema = new Schema(
    {
        username : {
            type : String,
            required : true ,
            unique : true ,
            lowercase : true ,
            trim : true ,
            index : true // this makes the field optimisable Searchable, although its costly but not much
        },
        email : {
            type : String,
            required : true ,
            unique : true ,
            lowercase : true ,
            trim : true ,
        },
        fullName : {
                type :String ,
                required : true ,
                trim : true ,
                index : true 
        },
        avatar : {
            type :String, //cloudinary 
            required : true ,
        },
        coverImage : {
            type : String
        },
        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ],
        password : {
            type : String ,
            required : [true , 'Password is required']
        },
        refreshToken : {
            type : String 
        },
    }, 
    {
        timestamps : true 
    }
)

userSchema.pre("save" , async function (next) {
    if(this.isModified("password")){
        this.password = await bcrypt.hash(this.password , 10) 
    }
    next()
})

userSchema.methods.isPasswordCorrect = async function(oldPassword) {
    console.log('Old Password:', oldPassword);
    console.log('Hashed Password from DB:', this.password);  // Use `this.password` to access the hashed password from the user instance
    return await bcrypt.compare(oldPassword, this.password);  // Compare the entered password with the user's password
}


userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User" , userSchema)