const mongoose=require('mongoose');
async function connectDB(){
    try{
        await mongoose.connect(process.env.MONGOOSE_URI);
        console.log('server is connected to DB');
    }catch(err){
        console.error('database connection error',err);
        process.exit(1);
    }
}

module.exports=connectDB;