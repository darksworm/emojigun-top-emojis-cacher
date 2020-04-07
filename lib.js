const axios = require('axios');
const JSZip = require('jszip');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

function generateZip(files) {
  console.log('generating zip');

  let zip = new JSZip();

  files.flat().map(file => {
    zip.file(file.filename, file.blob);
  });

  return zip.generateAsync({type: 'nodebuffer'}).then(blob => {
    let param = {
      Bucket: 'emojigun.com',
      Body: blob,
      Key: 'top-emojis.zip',
      ACL: 'public-read',
      CacheControl: 'max-age=604800,public',
    };

    console.log('zip generated');

    return s3.upload(param, function(err, data) {
      if (err) {
        console.log(err, err.stack);
        throw err;
      } else {
        console.log(data);
      }
    });
  });
}

function getLargestUrl(urls) {
  let maxIdx = Object.keys(urls)
    .sort()
    .reverse()[0];

  let url = urls[maxIdx];
  if (url.indexOf('https') === -1) {
    return 'https:' + url;
  }

  return url;
}

function getEmoji(name, urls) {
  let largestUrl = getLargestUrl(urls);
  let urlTextAfterLastDot = largestUrl.split('.').slice(-1)[0];
  let filename = name;
  if (urlTextAfterLastDot !== largestUrl) {
    filename += '.' + urlTextAfterLastDot.toLowerCase();
  }

  return {
    name: name,
    filename: filename,
    url: largestUrl,
  };
}

function getFile(name, urls) {
  return new Promise(resolve => {
    let emoji = getEmoji(name, urls);

    axios({
      url: emoji.url,
      method: 'GET',
      responseType: 'arraybuffer',
    }).then(response => {
      emoji.blob = response.data;
      resolve(emoji);
    });
  });
}

module.exports = {
  generateZip,
  getLargestUrl,
  getEmoji,
  getFile,
};
