let twitter_options = { enabled: false };

function sendDataToContentScript(tabId, data) {
  chrome.tabs.sendMessage(tabId, { message: "network_data_m3u8", data: data });
}

function parseM3U8Url(url) {
  const regex = /.*\/amplify_video\/([^\/]+)\/.*\/(\d+x\d+)\/.*/g;

  const [id, width, height] = url.replace(regex, "$1x$2").split("x");

  return { id, width: +width, height: +height };
}

function fetchM3U8(url) {
  return fetch(url).then(res => res.text());
}

function parseM3U8(m3u8Content) {
  const lines = m3u8Content.split("\n");
  const result = {
    segments: []
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith("#EXT-X-MAP:")) {
      const url = line.replace(/#EXT-X-MAP:URI="([^"]+)"/, "$1");
      result.segments.push({ duration: 0, url });
    } else if (line.startsWith("#EXTINF:")) {
      const duration = parseFloat(line.split(":")[1]);
      i++;
      const url = lines[i].trim();
      result.segments.push({ duration, url });
    }
  }

  return result;
}

function handleBeforeRequest(details) {
  if (!twitter_options.enabled) {
    return;
  }

  if ("xmlhttprequest" !== details.type) {
    return;
  }

  if (details.tabId < 1) {
    return;
  }

  const url = new URL(details.url);

  if (!url.pathname.endsWith(".m3u8")) {
    return;
  }

  if ("fmp4" !== url.searchParams.get("container")) {
    return;
  }

  fetchM3U8(details.url).then(m3u8Content => {
    const parsedData = parseM3U8(m3u8Content);

    if (parsedData.segments.length) {
      sendDataToContentScript(details.tabId, {
        ...parseM3U8Url(details.url),
        ...parsedData,
        url: details.url
      });
    }
  });
}

chrome.webRequest.onBeforeRequest.addListener(handleBeforeRequest, {
  urls: ["<all_urls>"]
});

chrome.storage.sync.get("twitter_options", obj => {
  twitter_options.enabled = obj.twitter_options.enabled;
  console.log(twitter_options);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === "updateOptions") {
    if (request.twitter_options) {
      twitter_options.enabled = request.twitter_options.enabled;
    }
  }
});
