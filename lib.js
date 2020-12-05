const axios = require('axios');
const JSZip = require('jszip');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

function generateZip(zip) {
    return new Promise( (resolve, reject) => {
        console.log('generating zip');

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
                    reject(err);
                } else {
                    console.log("success");
                    console.log(data);
                    resolve(data);
                }
            });
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

    return {
        name: name,
        url: largestUrl
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
            const contentDisposition = response.headers['content-disposition'];
            emoji.filename = contentDisposition.split('"').slice(-2)[0];

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
