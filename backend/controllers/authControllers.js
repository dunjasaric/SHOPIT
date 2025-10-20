import catchAsyncErrors from "../middlewares/catchAsyncErrors.js"
import User from "../models/user.js"
import { getResetPasswordTemplate } from "../utils/emailTemplates.js"
import ErrorHandler from "../utils/errorHandler.js"
import sendToken from "../utils/sendToken.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

//register user
export const registerUser = catchAsyncErrors (async(req, res, next) => {
    const { name, email, password } = req.body;

    const user = await User.create({
        name, email, password
    });

    const token = user.getJwtToken()

    sendToken(user, 201, res);
});

//login user
export const loginUser = catchAsyncErrors (async(req, res, next) => {
    const { email, password } = req.body;
    
    if(!email || !password) {
        return next(new ErrorHandler("Please enter email & password", 400))
    }

    // find user in the database
    const user = await User.findOne({ email }).select("+password")

    if(!user) {
        return next(new ErrorHandler("Invalid email or password", 401))
    }

    // check if password is correct
    const isPasswordMatched = await user.comparePassword(password)

    if(!isPasswordMatched) {
        return next(new ErrorHandler("Invalid email or password", 401))
    }

    const token = user.getJwtToken()

    sendToken(user, 200, res);
});

//logout user
export const logout = catchAsyncErrors (async (req, res, next) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        message: "Logged Out",
    });
});


//forgot password user
export const forgotPassword = catchAsyncErrors (async(req, res, next) => {
    
    // find user in the database
    const user = await User.findOne({ email: req.body.email });

    if(!user) {
        return next(new ErrorHandler("User not found with this email", 404));
    }

    // get reset password token
    const resetToken = user.getResetPasswordToken()

    await user.save()

    //create reset password url

    const resetUrl = `${process.env.FRONTEND_URL}/api/v1/password/reset/${resetToken}`;

    const message = getResetPasswordTemplate(user?.name, resetUrl);

    try{
        await sendEmail({
            email: user.email,
            subject: "ShopIT Password Recovery",
            message,
        });

        res.status(200).json({
            message:  `Email sent to: ${user.email}`,
        });
    } catch(error){
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined

        await user.save();
        return next(new ErrorHandler(error?.message, 500));
    }
});

//RESET PASSWORD
export const resetPassword = catchAsyncErrors (async(req, res, next) => {
    //hash the url token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    })

     if(!user) {
        return next(
            new ErrorHandler(
                "Password reset token is invalid or has been expired", 
                404
            )
        );
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(
            new ErrorHandler("Password does not match",400));
    }

    //set the new password
    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
});

//Get current user profile
export const getUserProfile = catchAsyncErrors(async(req, res, next) => {
    const user = await User.findById(req?.user?._id);

    res.status(200).json({
        user,
    });
});

//Update password
export const updatePassword = catchAsyncErrors(async(req, res, next) => {
    const user = await User.findById(req?.user?._id).select("+password");

    //check the previous user password
    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if(!isPasswordMatched){
        return next(new ErrorHandler("Old Password is incorrect", 400));
    }

    user.password = req.body.password;
    user.save();

    res.status(200).json({
        success: true,
    });
});


//Update User profile 
export const updateProfile = catchAsyncErrors(async(req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email
    }

    const user = await User.findByIdAndUpdate(req.user._id, newUserData, { 
        new: true,
    });

    res.status(200).json({
        user
    });
});


//Get All Users
export const allUsers = catchAsyncErrors(async(req, res, next) => {

    const users = await User.find();

    res.status(200).json({
        users,
    });
});


//Get User Details - ADMIN
export const getUserDetails = catchAsyncErrors(async(req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`, 404));
    }

    res.status(200).json({
        user,
    });
});


//Update User Details - ADMIN 
export const updateUser = catchAsyncErrors(async(req, res, next) => {

    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
    };

    const user = await User.findByIdAndUpdate(req.params.id, newUserData, { 
        new: true,
    });

    res.status(200).json({
        user,
    });
});



//Delete User - ADMIN
export const deleteUser = catchAsyncErrors(async(req, res, next) => {

    const user = await User.findById(req.params.id);

    if(!user){
        return next(new ErrorHandler(`User not found with id: ${req.params.id}`, 404));
    }

    //TODO - Remove User avatar from cloudinary

    await user.deleteOne()

    res.status(200).json({
        success: true,
    });
});