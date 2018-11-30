var storyText = document.getElementById('story-text');

function renderStoryText({ text }) {
  storyText.innerHTML = text;
}

module.exports = renderStoryText;
