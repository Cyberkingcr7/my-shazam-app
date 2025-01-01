const { Shazam } = require('unofficial-shazam');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Set up Multer for handling file uploads (uploads are temporary in serverless functions)
const upload = multer({ dest: '/tmp/' });

// Shazam instance
const shazam = new Shazam();

exports.handler = async (event, context) => {
  // Parse the body and the file upload
  if (event.httpMethod === 'POST') {
    const formData = new FormData(event.body);
    const audioFile = formData.get('audio');
    if (!audioFile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No audio file uploaded' })
      };
    }

    try {
      // Save the file temporarily
      const tempFilePath = path.join('/tmp', audioFile.name);
      fs.writeFileSync(tempFilePath, audioFile.buffer);

      // Recognize the uploaded audio file with Shazam
      const recognizeResult = await shazam.recognise(tempFilePath, 'en-US');
      console.log('Recognition result:', JSON.stringify(recognizeResult, null, 2));

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      if (recognizeResult && recognizeResult.track) {
        const track = recognizeResult.track;

        const songInfo = {
          title: track.title || 'Not available',
          artist: track.subtitle || 'Not available',
          appleMusic: track.share.href || 'Not available',
          spotify: track.myshazam?.apple?.previewurl || 'Not available',
          album: track.sections[0]?.metadata?.find(item => item.title === 'Album')?.text || 'Not available',
          coverArt: track.images.coverart || 'Not available'
        };

        return {
          statusCode: 200,
          body: JSON.stringify(songInfo)
        };
      } else {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'No song found.' })
        };
      }
    } catch (error) {
      console.error('Error recognizing the song:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'An error occurred during recognition.' })
      };
    }
  }
};
