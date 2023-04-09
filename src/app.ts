/* eslint-disable no-console */
/* eslint-disable import/no-internal-modules */
import './utils/env';
import { App, ExpressReceiver, LogLevel } from '@slack/bolt';
import { isGenericMessageEvent } from './utils/helper';
import { ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';

export const CHAT_GPT_SYSTEM_PROMPT = `
You are an excellent AI assistant Slack Bot.
Please output your response message according to following format.
- bold: "*bold*"
- italic: "_italic_"
- strikethrough: "~strikethrough~"
- code: " \`code\` "
- link: "<https://slack.com|link text>"
- block: "\`\`\` code block \`\`\`"
- bulleted list: "* item1"
Be sure to include a space before and after the single quote in the sentence.
ex) word\`code\`word -> word \`code\` word
Let's begin.
`;
export const GPT_BOT_NAME = 'GPT';

const postAsGptBot = async ({
  client,
  channel,
  threadTs,
  text,
}: {
  client: any;
  channel: string;
  threadTs: string;
  text: string;
}) => {
  return await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    icon_emoji: ':robot_face:',
    username: GPT_BOT_NAME,
    text,
  });
};

const receiver = new ExpressReceiver({
  signingSecret: process.env['SLACK_SIGNING_SECRET'] as string,
});

const app = new App({
  token: process.env['SLACK_BOT_TOKEN'] as string,
  signingSecret: process.env['SLACK_SIGNING_SECRET'] as string,
  receiver,
  logLevel: LogLevel.DEBUG,
  customRoutes: [{
    path: '/ping',
    method: ['GET'],
    handler: (_req, res) => {
      res.writeHead(200);
      res.end('yay!');
    },
  }],
});

app.use(async ({ next }) => {
  await next!();
});

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  if (!isGenericMessageEvent(message)) return;

  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey there <@${message.user}>!`,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Click Me',
          },
          action_id: 'button_click',
        },
      },
    ],
    text: `Hey there <@${message.type}>!`,
  });
});

app.event('app_mention', async ({ event, client }) => {
  const { thread_ts: threadTs, bot_id: botId, text } = event as any;

  console.log(`received mention mention event: ${JSON.stringify(event)}`);

  if (botId || !threadTs) {
    console.log('ignored event');
    await postAsGptBot({
      client,
      channel: event.channel,
      threadTs,
      text: `I will igonre this event`,
    });
    return;
  }

  await postAsGptBot({
    client,
    channel: event.channel,
    threadTs,
    text: `I will reply to this thread. Please wait a moment.`,
  });
  // fetch thread messages
  const threadMessagesResponse = await client.conversations.replies({
    channel: event.channel,
    ts: threadTs,
  });

  const messages = threadMessagesResponse.messages?.sort(
    (a, b) => Number(a.ts) - Number(b.ts),
  );

  // Except the first message, get the last 20 messages
  const prevMessages = messages!.slice(1).slice(-20).map((m) => {
    const role = m.bot_id
      ? ChatCompletionRequestMessageRoleEnum.Assistant
      : ChatCompletionRequestMessageRoleEnum.User;
    return { role: role, content: m.text as string };
  });

  const configuration = new Configuration({
    apiKey: process.env['OPENAI_API_KEY'] as string,
  });
  const openAIClient = new OpenAIApi(configuration);

  let message = '';
  try {
    // Chat Completion API を呼び出す
    const response = await openAIClient.createChatCompletion({
      model: 'gpt-3.5-turbo',
      // build message to send to GPT-3
      messages: [
        {
          role: ChatCompletionRequestMessageRoleEnum.System,
          content: CHAT_GPT_SYSTEM_PROMPT,
        },
        ...prevMessages,
        {
          role: ChatCompletionRequestMessageRoleEnum.User,
          content: text as string,
        },
      ],
      top_p: 0.5,
      frequency_penalty: 0.5,
    });
    message = response?.data?.choices[0]?.message?.content || '';
  } catch (e) {
    await postAsGptBot({
      client,
      channel: event.channel,
      threadTs,
      text: `An error occurred while requesting open api: error ${e}`,
    });
  }

  // Reply to the thread
  if (message) {
    await postAsGptBot({
      client,
      channel: event.channel,
      threadTs,
      text: message,
    });
  } else {
    await postAsGptBot({
      client,
      channel: event.channel,
      threadTs,
      text: 'message from gpt is empty',
    });
  }
});

app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

(async () => {
  // Start your app
  const port = Number(process.env['PORT']) || 8080;
  await app.start(port);

  console.log(`⚡️ Bolt app is running on port ${port}!`);
})();
