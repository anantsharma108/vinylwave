const express=require('express');
const router=express.Router();
const musicController=require('../controllers/music.controllers');
const authMiddleware=require('../middlewares/auth.middleware');
const multer=require('multer');
const upload=multer({storage:multer.memoryStorage()});

router.post('/upload/music',authMiddleware.authArtist,upload.single('music'),musicController.createMusic);
router.post('/upload/album',authMiddleware.authArtist,musicController.createAlbum);
router.get('/',authMiddleware.authUser,musicController.getMusics);
router.get('/albums',authMiddleware.authUser,musicController.getAlbums);
router.get('/album/:id',authMiddleware.authUser,musicController.getAlbumSongs);

module.exports=router;