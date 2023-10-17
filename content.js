const TWITTER_DOWNLOAD_SERVER = "https://video.twimg.com";
const videos = {};
let rules;

function applyRule({ selector, action, style }) {
  const elements = document.querySelectorAll(selector);

  elements.forEach(el => {
    if ("style" === action && style) {
      Object.keys(style).forEach(key => {
        el.style[key] = style[key];
      });
    } else if ("remove" === action) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    } else if ("blur" === action) {
      el.classList.add("blur");
    }
  });
}

async function fetchAndMergeM4SSegments(urls) {
  document.body.style.cursor = "wait";

  // Fetch all segments using Promise.all to run fetches concurrently.
  const responses = await Promise.all(
    urls.map(url =>
      fetch(url).then(res => {
        if (!res.ok) {
          throw new Error(res.statusText);
        }

        return res.blob();
      })
    )
  );

  // Convert each response to a blob.
  const blobs = await Promise.all(responses);

  // Convert blobs to array buffers.
  const arrayBuffers = await Promise.all(blobs.map(blob => blob.arrayBuffer()));

  // Merge all array buffers into a single Uint8Array.
  const mergedArray = new Uint8Array(
    arrayBuffers.reduce((acc, curr) => acc + curr.byteLength, 0)
  );
  let offset = 0;
  for (let buffer of arrayBuffers) {
    mergedArray.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }

  // Convert merged array to blob.
  const mergedBlob = new Blob([mergedArray], {
    type: "application/octet-stream"
  });

  document.body.style.cursor = "default";

  // Create a download link and trigger download.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(mergedBlob);
  a.download = urls[0].replace(/.+\/([^\/]+)$/, "$1");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadVideo(video) {
  const { url, id, width, height, segments } = video;

  const urls = segments.map(({ url }) => TWITTER_DOWNLOAD_SERVER + url);

  return fetchAndMergeM4SSegments(urls);
}

function highlightVideo(video) {
  const { url, id, prefix, width, height, segments } = video;

  const selector = [
    `video[poster*="\\/${prefix}\\/${id}\\/"]`,
    `video[poster*="\\/${prefix}_thumb\\/${id}\\/"]`
  ].join(", ");

  const elements = document.querySelectorAll(selector);

  elements.forEach(el => {
    const btnId = "btn-video-" + id;

    if (!document.getElementById(btnId)) {
      const newButton = document.createElement("div");
      newButton.classList.add("btn-video");
      newButton.setAttribute("id", "btn-video-" + id);
      newButton.setAttribute("title", `Download video (${width}x ${height})`);
      newButton.innerHTML =
        '<svg width="1.5rem" height="1.5rem" version="1.1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="m18.2 1c0.53 0 1.04 0.211 1.41 0.586l2.83 2.83c0.375 0.375 0.586 0.884 0.586 1.41v14.2c0 1.66-1.34 3-3 3h-16c-1.66 0-3-1.34-3-3v-16c0-1.66 1.34-3 3-3h14.2zm-14.2 2c-0.552 0-1 0.448-1 1v16c0 0.552 0.448 1 1 1h1v-6c0-1.66 1.34-3 3-3h8c1.66 0 3 1.34 3 3v6h1c0.552 0 1-0.448 1-1v-13.2c0-0.53-0.211-1.04-0.586-1.41l-1.83-1.83c-0.375-0.375-0.884-0.586-1.41-0.586h-0.172v2c0 1.66-1.34 3-3 3h-4c-1.66 0-3-1.34-3-3v-2h-3zm13 18v-6c0-0.552-0.448-1-1-1h-8c-0.552 0-1 0.448-1 1v6h10zm-8-18h6v2c0 0.552-0.448 1-1 1h-4c-0.552 0-1-0.448-1-1v-2z" clip-rule="evenodd" fill-rule="evenodd"/></svg>';
      newButton.addEventListener("click", e => {
        downloadVideo(video);
      });

      el.parentNode.appendChild(newButton);
    }
  });
}

// Function to apply border to the matching elements
function highlightElements() {
  if (rules) {
    rules.forEach(rule => applyRule(rule));
  }
}

function highlightVideos() {
  Object.keys(videos).forEach(_id => {
    //const { url, id, prefix, width, height, segments } = videos[_id];

    highlightVideo(videos[_id]);
  });
}

// Callback function to execute when mutations are observed
function handleRulesMutations(mutationsList, observer) {
  highlightElements();
}

// Callback function to execute when mutations are observed
function handleVideosMutations(mutationsList, observer) {
  let hasMutation = false;
  for (let mutation of mutationsList) {
    if (mutation.addedNodes) {
      const nodes = Array.from(mutation.addedNodes).filter(node => {
        if (node.parentElement) {
          return (
            (!node.classList || !node.classList.contains("btn-video")) &&
            node.parentElement.querySelector("video[poster]")
          );
        }

        return false;
      });

      if (nodes.length) {
        hasMutation = true;
        break;
      }
    }
  }

  if (hasMutation) {
    highlightVideos();
  }
}

// Only apply highlighting if the option is enabled
chrome.storage.sync.get("rules", obj => {
  if (Array.isArray(obj.rules)) {
    rules = obj.rules.filter(rule => rule.enabled);
  }

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(handleRulesMutations);

  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Select the target node for the observer
  const targetNode = document.body;

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);

  if (Array.isArray(obj.rules)) {
    // Highlight elements already in the DOM at script start
    highlightElements();
  }
});

chrome.storage.sync.get("twitter_options", obj => {
  if (!(obj.twitter_options || {}).enabled) {
    return;
  }

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(handleVideosMutations);

  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: true };

  // Select the target node for the observer
  const targetNode = document.body;

  // Start observing the target node for configured mutations
  observer.observe(targetNode, config);

  // Highlight elements already in the DOM at script start
  highlightVideos();
});

// Listening for M3U8 messages from background script
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.message === "network_data_m3u8") {
    videos[request.data.id] = request.data;

    //highlightVideos();
  }
});
