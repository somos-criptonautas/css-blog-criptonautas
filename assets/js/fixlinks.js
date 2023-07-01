// Change the details here:
const BASE_URL = "criptonautas.co";
const api = new GhostAdminAPI({
  url: `https://${BASE_URL}`,
  version: "v5.0",
  key: "67a4adda24ec46cecd0edd6180",
});
const POST_ID = "POST ID (TAKE FROM DRAFT URL: /ghost/#/editor/post/{ID})";

// TO RUN: node fixLinks.js
// MIT License.

const GhostAdminAPI = require("@tryghost/admin-api");
const path = require("path");

const urlRegex = /(https?:\/\/[^\s\)(">)]+)/g;
const addRef = (link, ref) => {
  var url = new URL(link);
  if (!url.href.includes("ref=") && !url.href.includes(ref)) {
    url.searchParams.append("ref", ref);
  } else {
    return link;
  }
  return url.href;
};

// When copying links from google docs there is a bug with prefix spaces
const trimLinks = (item, lastItem) => {
  if (!item) return;
  if (item.length === 4 && item[1] instanceof Array && item[1] > 0) {
    if (item[3].charAt(0) == " ") {
      item[3] = item[3].trimStart();

      // We now need to add a space to the last item before it
      if (
        lastItem &&
        lastItem.length === 4 &&
        lastItem[1] instanceof Array &&
        !(lastItem[1] > 0)
      )
        lastItem[3] += " ";
    }
    return;
  }

  lastItem = null;
  for (const i of item) {
    if (i instanceof Array) {
      trimLinks(i, lastItem);
      lastItem = i;
    }
  }
};

(async () => {
  const res = await api.posts.read({ id: POST_ID });
  let mdoc = res.mobiledoc;

  let mdocP = JSON.parse(mdoc);

  // Fix links extra spaces:
  let sections = mdocP.sections;
  trimLinks(sections);
  mdocP.sections = sections;

  // FIx regular parts
  let markups = mdocP.markups;
  for (let m of markups) {
    if (m[0] === "a" && m[1][0] === "href") {
      m[1][1] = addRef(m[1][1], BASE_URL);
    }
  }
  mdocP.markups = markups;

  // Fix extra markup cards (markdown and callout)
  let cards = mdocP.cards;
  for (let c of cards) {
    if (c[0] === "markdown") {
      c[1].markdown = c[1].markdown.replace(urlRegex, (url) => {
        return addRef(url, BASE_URL);
      });
    }
  }
  for (let c of cards) {
    if (c[0] === "callout") {
      c[1].calloutText = c[1].calloutText.replace(urlRegex, (url) => {
        return addRef(url, BASE_URL);
      });
    }
  }

  mdocP = JSON.stringify(mdocP);
  await api.posts.edit({
    id: POST_ID,
    mobiledoc: mdocP,
    updated_at: res.updated_at,
  });
  console.log("updated links successfully");
})();
