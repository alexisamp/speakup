// content.js — extracts page context and responds to popup requests

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type !== "GET_CONTEXT") return false;

  const title = document.title || "";
  const url = location.href;

  // Prefer article/main content, skip nav/footer/header/aside
  const SKIP_TAGS = new Set(["NAV", "FOOTER", "HEADER", "ASIDE", "SCRIPT", "STYLE", "NOSCRIPT"]);

  function extractText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        let el = node.parentElement;
        while (el && el !== root) {
          if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
          el = el.parentElement;
        }
        return node.textContent.trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const chunks = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (text.length > 20) chunks.push(text);
    }
    return chunks.join(" ").replace(/\s+/g, " ").trim();
  }

  // Try article first, then main, then body
  const container =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.body;

  const fullText = extractText(container);
  const excerpt = fullText.slice(0, 600);

  sendResponse({ title, excerpt, url });
  return true;
});
