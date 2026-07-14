const ImageKit=require('@imagekit/nodejs/index.js');
const client = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY // This is the default and can be omitted
});

async function uploadMusic(Buffer){
    const response = await client.files.upload({
        file:Buffer.toString("base64"),
        fileName: 'music_'+Date.now(),
        folder:"spotify"
    });
    return response;
}

module.exports=uploadMusic;
