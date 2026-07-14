const mongoose=require('mongoose');

const muiscSchema=new mongoose.Schema({
    uri:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    artist:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
    }
});

const musicModel=mongoose.model('music',muiscSchema);
module.exports=musicModel;