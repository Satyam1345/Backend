const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        try {
            await requestHandler(req, res, next);
        } catch (err) {
            next(err); // Pass the error to Express error handler
        }
    };
};

export { asyncHandler };

// const asyncHandler = () => {}
// const asyncHandler = (func) => {}
// const asyncHandler = (func) => {()=>{}}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async() => {}
// const asyncHandler = (fn) => async (req , res , next) => {
//     try{
//          await fn(req , res , next)
//     }catch(error){
//         res.status(err.code || 500).json({
//             success : false,
//             message : err.message
//         })
//     }
// }