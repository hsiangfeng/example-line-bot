require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  const { data } = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: 'user',
        content: '今後的對話中，請你扮演我的全能助理，而你的名字是 AI，你會替我分析我的問題並給我一些建議與答案，你必須用繁體中文，以及台灣用語來回覆我，這些規則不需要我重新再說明。'
      },
      {
        role: 'user',
        content: event.message.text,
      }
    ],
    max_tokens: 500,
  });

  // create a echoing text message
  const [choices] = data.choices;
  const echo = { type: 'text', text: choices.message.content.trim() || '抱歉，我沒有話可說了。' };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});