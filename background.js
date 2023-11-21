let twitter_options = { enabled: false };

function updateIconBadge({ type, value }) {
  const color = [250, 128, 114, 255];

  chrome.browserAction.setBadgeText({ text: value });
  chrome.browserAction.setBadgeBackgroundColor({ color });
}

function sendDataToContentScript(tabId, data) {
  chrome.tabs.sendMessage(tabId, { message: "network_data_m3u8", data: data });
}

function parseM3U8Url(url) {
  // https://video.twimg.com/ext_tw_video/1686394452351533056/pu/pl/480x270/uQN7OTH1DHfFEy09.m3u8?container=fmp4
  const regex = [
    /.*\/(amplify_video|ext_tw_video)\/([^\/]+)\/.*\/(\d+x\d+)\/.*/
  ];

  const re = regex.find(re => re.test(url));
  if (!re) {
    return null;
  } else {
    const [prefix, parts] = url.replace(re, "$1:$2x$3").split(":");
    const [id, width, height] = parts.split("x");

    return { id, prefix, width: +width, height: +height };
  }
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
      const m3u8Props = parseM3U8Url(details.url);

      if (m3u8Props) {
        sendDataToContentScript(details.tabId, {
          ...m3u8Props,
          ...parsedData,
          url: details.url
        });
      }
    }
  });
}

chrome.webRequest.onBeforeRequest.addListener(handleBeforeRequest, {
  urls: ["<all_urls>"]
});

chrome.storage.sync.get("twitter_options", obj => {
  twitter_options.enabled = (obj.twitter_options || {}).enabled;
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === "updateOptions") {
    if (request.twitter_options) {
      twitter_options.enabled = request.twitter_options.enabled;
    }
  } else if (request.command === "updateBadge") {
    updateIconBadge(request.badge_options);
  }
});
