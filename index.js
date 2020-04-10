const lib = require('./lib');
const axios = require('axios');
const fs = require('fs');

exports.handler = async event => {
  const blacklistWords = fs
    .readFileSync('blacklist.txt')
    .toString()
    .split('\n')
    .filter(x => x);

  const blacklistRegex = new RegExp(blacklistWords.join('|'), 'gi');

  let files = [];
  let promises = {};
  let emotePromises = [];

  for (let page = 1; page <= 2; page++) {
    let ffzPromise = axios
      .get(
        'https://api.frankerfacez.com/v1/emoticons?sort=count&per_page=200&page=' +
          page,
      )
      .then(function(response) {
        response.data.emoticons
          .filter(x => !blacklistRegex.test(x.name))
          .map(x => {
            let promise = lib.getFile(x.name, x.urls).then(function(file) {
              files.push(file);
              console.log(files.length, 'files downloaded');
            });

            emotePromises.push(promise);
          });
      });

    promises['ffz' + page] = ffzPromise;
  }

  await axios
    .get(
      'https://api.streamelements.com/kappa/v2/chatstats/global/stats?limit=100',
    )
    .then(function(resp) {
      for (let emote of resp.data.ffzEmotes) {
        if (blacklistRegex.test(emote.emote)) {
          continue;
        }

        let promise = axios
          .get('https://api.frankerfacez.com/v1/emote/' + emote.id)
          .then(
            function(loadedEmote) {
              let promise = lib
                .getFile(
                  loadedEmote.data.emote.name,
                  loadedEmote.data.emote.urls,
                )
                .then(function(file) {
                  files.push(file);
                  console.log(files.length, 'files downloaded');
                });

              emotePromises.push(promise);
            },
            function() {
              // if a request fails there is not much we can do
              delete promises[emote.id];
            },
          );

        promises[emote.id] = promise;
      }

      return Promise.all(Object.values(promises)).then(function() {
        return Promise.all(emotePromises).then(function() {
          return lib.generateZip(files);
        });
      });
    });
};
