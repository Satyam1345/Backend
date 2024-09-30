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

export const refreshAccessToken = asyncHandler(async (req, res) =>{

   const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
    console.log(error) 
    throw new ApiError(401 , "Unautorised Request, Token wrong")
   }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401 , "Invalid Refresh Token, User not Found")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401 , "Refresh Token is Expired or Used")
        }
    
        const options = {
            httpOnly : true ,
            secure : true
        }
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
        return res.status.cookie("accessToken" , accessToken).cookie("refreshToken" , newRefreshToken).json(
            new ApiResponse(
                200 , 
                {accessToken , refreshToken : newRefreshToken} , "Access token refreshed"
            )
        )
    } catch (error) {
        console.log(error)
        throw new ApiError(401 , error?.message || "Invalid Refresh Token")
    }
});

export const changeCurrentPassword = asyncHandler(async(req , res) =>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const curr_pass_check = await user.isPasswordCorrect(oldPassword)

    if(!curr_pass_check){
        throw new ApiError(400 , "Invalid Password Entered") ;
    }

    user.password = newPassword ;
    await user.save({validateBeforeSave : false })

    return res.status(200).json(new ApiResponse(200 , {} , "Password changed Successfully"))
})

export const getCurrentUser = asyncHandler(async(req, res) =>{
    return res.status(200),json( new ApiResponse( 200 , req.user , "Current User fetch successful"))
})

export const updateAccountDetails = asyncHandler(async(req , res) =>{
    const {fullName , email} = req.body 

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName , 
                email : email // both ways of writing works perfectly fine 
            }
        } , 
        {new : true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200 , user , "Account Details updated successfully"))
})

export const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const avatar = await upload_on_cloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400 , "Error while uploading the avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set : {
                avatar : avatar.url 
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200 , user , "Cover Image updated successfully")
    )
})


export const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400 , "Avatar file is missing")
    }

    const coverImage = await upload_on_cloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400 , "Error while uploading the avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id , 
        {
            $set : {
                coverImage : coverImage.url 
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200 , user , "Cover Image updated successfully")
    )
})


export const getUserChannelProfile = asyncHandler(async(req , res) =>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400 , "Username is Missing") ;
    }
    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions" ,
                localField : "_id" ,
                foreignField : "subscriber" ,
                as : "subscribedTo" 
            }
        },
        {
            $addFields : { 
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : { 
                    $cond : { 
                        if : {$in : [req.user?._id , "$subscribers.subscriber"]},
                        then : true ,
                        else : false 
                    }
                }
            }
        },
        {
            $project : { 
                fullName : 1 ,
                username : 1 ,
                subscribersCount : 1 ,
                channelsSubscribedToCount : 1 ,
                isSubscribed : 1 ,
                avatar : 1 ,
                coverImage : 1 ,
                email : 1

            }
        }
    ])

    console.log(channel) 

    if(!channel?.length){
        throw new ApiError(404 , "Channel does not exist") 
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0] ,"User channel fetched successfully")
    )
})

export const getWatchHistory = asyncHandler(async(req , res) =>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id) 
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory" ,
                foreignField : "_id" ,
                as : "watchHistory" ,
                pipeline : [
                    {
                        $lookup : {
                            from : "users" ,
                            localField : "owner" ,
                            foreignField : "_id" ,
                            as : "owner" ,
                            pipeline : [
                                {
                                    $project : {
                                        fullName  : 1 ,
                                        username : 1 ,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    } ,
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200 , user[0].watchHistory , "Watch History Fetched Successfully")
    )
})