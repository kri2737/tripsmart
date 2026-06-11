const User = require("../models/User");
const bcrypt = require ("bcryptjs");
const jwt = require("jsonwebtoken");


//Register
exports.register = async( req, res) =>{
    try{
        const{ name , email, password} = req.body;

        const existingUser= await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message: "User already Registered"});
        }

        const hashedPassword = await bcrypt.hash(password,12);

        const user = await User.create({
            name,
            email,
            password : hashedPassword
        });

        const token = jwt.sign(
            {userId : user._id},
            process.env.JWT_SECRET,
            {expiresIn :"7d"}
        );

        res.status(201).json({
            token,
            userId: user._id,
            name: user.name,
            message : "Registration Sucessfull"
        });
    }catch (error) {
        console.log('REGISTER ERROR:', error);
        res.status(500).json({ message: error.message });
      }
};

//Login
exports.login = async(req,res)=>{
    try{
        const{email,password} = req.body;
        const user = await User.findOne({email});
        if(!user){
            return res.status(400).json({message:"User not found !"});
        }
        const isMatch = await bcrypt.compare(password , user.password);
        if(!isMatch){
            return res.status(400).json({message: "Invalid password"});
        }

        //Create JWT Token
        const token = jwt.sign(
            {userId : user._id},
            process.env.JWT_SECRET,
            {expiresIn: "7d"}
        );

        //sending response back
        res.status(200).json({
            token,
            UserId : user.id,
            name : user.name,
            mesaage: "Login Successful"
        });
    }catch(error){
        console.log("Error")
        res.status(500).json({message:"Something Went wrong"});
    }
};