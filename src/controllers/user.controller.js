import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { upload_on_cloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { upload } from "../middlewares/multer.middleware.js";
// import {isPasswordCorrect} from "../models/user.model.js" ;
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
    console.log("Request Body" , req.body) ;
    console.log("email" , email) ;    // testing if db connected or not
    console.log("password" , password) ;  
    console.log("fullName" , fullName) ;
    console.log("username" , username) ; 
    
    // Data Verification before storing responses
    // if(fullName === ""){
    //     throw new ApiError(400 , "fullName is required") 
    // }
    // OR
    if([fullName , email , username , password].some((field) => field ?.trim() === "" )){
        throw new ApiError(400 , "All fields are compulsory!");
    }

    // To check for already existing users based on any particular field
    const existedUser = await User.findOne({
        $or : [{username}  , {email}] 
    });
    if(existedUser){
        throw new ApiError(409 , "User with email or username already exist")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path ;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path ;
    
    // Second way of checking
    let coverImageLocalPath2;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath2 = req.files.coverImage[0].path
    }


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
        username : username.toLowerCase()

    });
    
    // To check successful creation of Data
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"  // '-' sign means this wont be included for the final creation of the User
    );

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering User" ) 
    }

    return res.status(201).json(
        new ApiResponse(200 , createdUser , "User Registered Successfully") 
    );
    
});

const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        console.log(error)
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}
export const loginUser = asyncHandler(async(req , res) => {
    // 1. Req body se data lekar aao
    // 2. Username or Email for Login
    // 3. Find the User
    // 4. Password Check
    // 5. Access andd Refresh Token
    // 6. Send Cookies
    console.log("Request Body", req.body);

    const {email , username , password} = req.body 
    if (!username || !email) {
        throw new ApiError(400, "username or email is required")
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

    const user = await User.findOne({
        $or : [{username} , {email}]
    });

    if(!user){
        throw new ApiError(400 , "User does not exist") ;
    }
    // "User" is MongoDb wala user , "user" is apna upar defined user
    const isPasswordValid =  await user.isPasswordCorrect(password) ;
    console.log("Is password valid?", isPasswordValid);  // Log the result of password validation

    if(!isPasswordValid){
        throw new ApiError(400 , "Password is Incorrect") ;
    }

    
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true ,
        secure : true 
    }
    return res.status(200).cookie("accessToken" , accessToken , options).cookie("refreshToken" , refreshToken , options).json(
        new ApiResponse(200 , {
            user : loggedInUser , accessToken , refreshToken
        },
    "User logged in Successfully"
    )
    )

});


export const logoutUser = asyncHandler(async (req , res) => {
//    Logut requires Cookie Removal and removal of Refresh Token
    await User.findByIdAndUpdate(
        req.user._id , 
        {
            $set : {
                refreshToken : undefined 
            }
        },
        {
            new : true  
        }
    )
    const options = {
        httpOnly : true ,
        secure : true 
    }

    return res.status(200).clearCookie("accessToken" , options).clearCookie("refreshToken"  ,options).json(new ApiResponse( 200 , {} , "User logged out Successfully !!!"))
});