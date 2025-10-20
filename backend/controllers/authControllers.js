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