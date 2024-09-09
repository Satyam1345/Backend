import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { upload_on_cloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const registerUser = asyncHandler(async (req, res) => {
    // 1. Get user details from frontend
    // 2. Validation - minimum check is not empty
    // 3. Check if User already exist : username , email
    // 4. Check for images, check for Avatar
    // 5. Upload them to Cloudinary
    // 6. Create User object, Create Entry in Database
    // 7. Remove Password and Refresh Token Field from Response
    // 8. Check for User Creation
    // 9. Return Response

    const {fullName, email , username , password} = req.body ;
    console.log("email" , email) ;    // testing if db connected or not
    console.log("password" , password) ;   
    
    // Data Verification before storing responses
    // if(fullName === ""){
    //     throw new ApiError(400 , "fullName is required") 
    // }
    // OR
    if([fullName , email , username , password].some((field) => field ?.trim() === "" )){
        throw new ApiError(400 , "All fields are compulsory!")
    }

    // To check for already existing users based on any particular field
    const existedUser = User.findOne({
        $or : [{username}  , {email}] 
    })
    if(existedUser){
        throw new ApiError(409 , "User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path ;
    const coverImageLocalPath = req.files?.coverImage[0]?.path ;
     

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar File is Required") ;
    }

    const avatar = await upload_on_cloudinary(avatarLocalPath) ;
    const coverImage = await upload_on_cloudinary(coverImageLocalPath) ;

    if(!avatar){
        throw new ApiError(400 , "Avatar File is Required") ;
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "" ,
        email,
        password,
        username : username.toLowerCase

    })
    
    // To check successful creation of Data
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  // '-' sign means this wont be included for the final creation of the User
    )

    if(!createdUser){
        throw new ApiError("Something went wrong while registering User" ) 
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Successfully") 
    )
    
});