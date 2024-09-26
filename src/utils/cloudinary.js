import {v2 as cloudinary} from "cloudinary" ;
import fs from "fs" ;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME ,
    api_key : process.env.CLOUDINARY_API_KEY ,
    api_secret : process.env.CLOUDINARY_API_SECRET
});


const upload_on_cloudinary = async(localFilePath) => {
    try{
        if (!localFilePath) {
            console.error("No local file path provided.");
            return null;
        }
        
        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type : "auto"
        }) 
       console.log(response);
        console.log("File is successfully uploaded in Cloudinary" , response.url) ;
        fs.unlinkSync(localFilePath) ;
        return response ; 

    }catch(error){
        console.error("Cloudinary upload failed:", error.message);
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath); // Remove the locally saved temporary file if upload fails
        } //remove the locally saved temporary file as the upload operation got failed 
       throw new ApiError(500, "Failed to upload file to Cloudinary");
    }
}

export {upload_on_cloudinary} ; 