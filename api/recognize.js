const { Shazam } = require('unofficial-shazam');
const multer = require('multer');
const fs = require('fs');

// Set up Multer for handling file uploads (uploads are temporary in serverless functions)
const upload = multer({ dest: '/tmp/' }).single('audio');

// Shazam instance
const shazam = new Shazam();

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    return new Promise((resolve) => {
      // Parse the form data using Multer
      upload(event, null, async (err) => {
        if (err) {
          console.error('Multer error:', err);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Error parsing form data' }),
          });
        }

        const audioFile = event.file;
        if (!audioFile) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'No audio file uploaded' }),
          });
        }

        try {
          // Recognize the uploaded audio file with Shazam
          const tempFilePath = audioFile.path;
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
              album:
                track.sections[0]?.metadata?.find((item) => item.title === 'Album')?.text || 'Not available',
              coverArt: track.images.coverart || 'Not available',
            };

            return resolve({
              statusCode: 200,
              body: JSON.stringify(songInfo),
            });
          } else {
            return resolve({
              statusCode: 404,
              body: JSON.stringify({ message: 'No song found.' }),
            });
          }
        } catch (error) {
          console.error('Error recognizing the song:', error);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred during recognition.' }),
          });
        }
      });
    });
  }

  return {
    statusCode: 405,
    body: 'Method Not Allowed',
  };
};
