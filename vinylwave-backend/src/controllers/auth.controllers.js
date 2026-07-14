const userModel=require('../models/user.model');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');

async function registerUser(req,res){
    const {username,email,password,role="user"}=req.body;
    const isUserExists=await userModel.findOne({
        $or:[
            {username},{email}
        ]
    });
    if(isUserExists){
        return res.status(401).json({
            message:"email or username already exist"
        });
    }
    const hash=await bcrypt.hash(password,10);
    const user=await userModel.create({
        username,
        email,
        password:hash,
        role
    });

    const token=jwt.sign({
        id:user._id,
        role
    },process.env.JWT_SECRET);

    res.cookie('token',token);
    
    res.status(201).json({
        message:"user created successfully",
        user:{
            id:user._id,
            username,
            email,
            role
        }
    })
}

async function loginUser(req,res){
    const {username,email,password}=req.body;

    const user=await userModel.findOne({
        $or:[
           {username},{email}
        ]
    })
    if(!user){
        return res.status(401).json({
            message:"invalid credentials"
        })
    }

    const isPasswordValid=await bcrypt.compare(password,user.password);
    if(!isPasswordValid){
        return res.status(401).json({
            message:"invalid credentials"
        })
    }

    const token=jwt.sign({
        id:user._id,
        role:user.role
    },process.env.JWT_SECRET);

    res.cookie('token',token,{
        httpOnly:true,
        sameSite:"lax"
    });
    
    res.status(201).json({
        message:"user logged in successfully",
        user:{
            id:user._id,
            username,
            email,
            role:user.role
        }
    })
}
async function logoutUser(req,res){
    res.clearCookie("token");
    res.status(200).json({message:"user logged Out successfully"});
}

module.exports={registerUser,loginUser,logoutUser};