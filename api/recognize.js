const { Shazam } = require('unofficial-shazam');
const multer = require('multer');
const fs = require('fs');
const streamifier = require('streamifier');
const { Readable } = require('stream');

// Set up Multer for handling file uploads
const upload = multer({ dest: '/tmp/' }).single('audio');
const shazam = new Shazam();

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    return new Promise((resolve) => {
      // Parse the form data using Multer
      const body = JSON.parse(event.body);
      upload(body, null, async (err) => {
        if (err) {
          console.error('Error parsing form data:', err);
          return resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Error parsing form data' }),
          });
        }

        const audioFile = body.audio;
        if (!audioFile) {
          return resolve({
            statusCode: 400,
            body: JSON.stringify({ error: 'No audio file uploaded' }),
          });
        }

        try {
          // Convert the file to a stream
          const buffer = fs.readFileSync(audioFile.path);
          const audioStream = streamifier.createReadStream(buffer);

          // Recognize the uploaded audio file with Shazam
          const recognizeResult = await shazam.recognise(audioStream, 'en-US');
          console.log('Recognition result:', JSON.stringify(recognizeResult, null, 2));

          // Clean up temporary file
          fs.unlinkSync(audioFile.path);

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
