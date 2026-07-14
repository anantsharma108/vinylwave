const musicModel=require('../models/music.model');
const albumModel=require('../models/album.model');
const jwt=require('jsonwebtoken');
const uploadMusic=require('../services/storage.service');

async function createMusic(req,res){
    const data=await uploadMusic(req.file.buffer);
    const music=await musicModel.create({
        title:req.body.title,
        uri:data.url,
        artist:req.user.id
    });
    res.status(201).json({
        message:"music created successfully",
        music,
    });
}
async function createAlbum(req,res){
    const{title,musics}=req.body;
    const album=await albumModel.create({
        title,
        musics,
        artist:req.user.id
    });
    res.status(201).json({
        message:"album created successfully",
        album,
    });

}
async function getMusics(req,res){
    const musics=await musicModel.find().limit(10).populate("artist","username email");
    res.status(201).json({
        message:"musics fetched successfully",
        musics
    });
}
async function getAlbums(req,res){
    const albums=await albumModel.find().limit(10).select("title artist").populate("artist","username email");
    res.status(201).json({
        message:"albums fetched successfully",
        albums
    });
}
async function getAlbumSongs(req,res){
    const albumId=req.params.id;
    const album=await albumModel.findOne({
        _id:albumId
    }).populate("artist", "username email");
    res.status(201).json({
        message:"albums fetched successfully",
        album
    });

}

module.exports={createMusic,createAlbum,getMusics,getAlbums,getAlbumSongs};