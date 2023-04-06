import { Context, h, Schema } from "koishi";

export const name = "glm-testbot";

export const usage = `
### 用前需知

此为测试版本，服务器地址已经写死，api提供者为[t4wefan](https://forum.koishi.xyz/u/t4wefan)


glm命令的别名是chat，二者等同

### 命令说明

使用“chat/glm+内容”来与ChatGLM对话

使用”chat 重置对话“来重置当前对话

使用“chat 加载”来要求glm扮演猫娘

使用“ glmmtg +内容 ” 来要求chatglm帮你生成绘画tag


`;

export interface Config {
  myServerUrl: string;
  send_glmmtg_response: boolean;
  prefix: string;
}

export const Config: Schema<Config> = Schema.object({
  myServerUrl: Schema.string().description("后端服务器地址").default(""),
  send_glmmtg_response: Schema.boolean()
    .description("使用glmmtg的时候是否会发送tag到会话框")
    .default(false),
  prefix: Schema.string().description("跑图机器人的前缀").default("rr"),
});

export async function apply(ctx, config: Config) {
  ctx.i18n.define("zh", require("./locales/zh"));
  const logger = ctx.logger("Chat_public");

  function mathRandomInt(a, b) {
    if (a > b) {
      // Swap a and b to ensure a is smaller.
      var c = a;
      a = b;
      b = c;
    }
    return Math.floor(Math.random() * (b - a + 1) + a);
  }

  function subsequenceFromStartLast(sequence, at1) {
    var start = at1;
    var end = sequence.length - 1 + 1;
    return sequence.slice(start, end);
  }

  var chat_id = mathRandomInt(1, 1000000);

  var chat_api_address = "服务器地址" + "chatglm?msg=";

  var preset_api_address = "服务器地址";

  ctx
    .command("glm", "与chatglm对话")
    .alias("chat")
    .action(async ({ session }, ...args) => {
      {
        let msg = subsequenceFromStartLast(session.content, 4).trim(),
          session_id = [
            "&source=blockly_public",
            "&usrid=|channel_id=",
            session.channelId,
            "|user_id=",
            session.userId,
            "|chat_id=",
            chat_id,
          ].join(""),
          response = "hello";
        if (args[0] == "load" || args[0] == "加载") {
          {
            let preset_id = 100000 + Number(args[1]);
            response = await ctx.http.get(
              [chat_api_address, "clear", session_id].join(""),
              { responseType: "text" }
            );
            await session.send(
              ["正在重置对话，加载预设＠", preset_id, "......", response].join(
                ""
              )
            );
            {
              let preset = await ctx.http.get(
                [preset_api_address, preset_id, ".txt"].join(""),
                { responseType: "text" }
              );
              if (preset == "404") {
                return (
                  String(h("at", { id: session.userId })) +
                  "你指定的预设不存在捏"
                );
              } else {
                response = await ctx.http.get(
                  [chat_api_address, preset, session_id].join(""),
                  { responseType: "text" }
                );
                await session.send(
                  [
                    h("at", { id: session.userId }),
                    "已加载预设＠",
                    preset_id,
                  ].join("")
                );
                return response;
              }
            }
          }
        }
        if (msg == "重置对话" || msg == "重置") {
          response = await ctx.http.get(
            [chat_api_address, "clear", session_id].join(""),
            { responseType: "text" }
          );
          return String(h("at", { id: session.userId })) + String(response);
        }
        if (args[0] == null || args[0] == "help") {
          return (
            String(h("at", { id: session.userId })) +
            String(
              await ctx.http.get(
                "https://drive.t4wefan.pub/d/koishi/chatglm_blockly/help.txt",
                { responseType: "text" }
              )
            )
          );
        } else {
          response = await ctx.http.get(
            [chat_api_address, msg, session_id].join(""),
            { responseType: "text" }
          );
          return String(h("at", { id: session.userId })) + String(response);
        }
      }
    });

      const cmd1 = ctx
        .command("glmmtg <text:text>", "输入你想画的画面，发送给ChatGLM，让ChatGLM来帮你写tag")
        .usage(`请确保当前聊天环境存在rryth或novelai插件
       使用例子：glmmtg 阳光沙滩`)
        .action(async ({ session }, text) => {
        const apiAddress = config.myServerUrl + "chatglm?msg=";
            const defaultText = "Use as many English tags as possible to describe a picture in detail. Use fragmentation word tags instead of sentences to describe the picture. Use as many descriptive words as possible, and separate each word with a comma. For example, when describing white haired cat, you should use English tag words such as white hair, cat girl, cat ears, cut, girl, beautiful, and happy. What you need to describe now is : ";
        const userText = defaultText + text;
        const session_id = [
            "&source=blockly_public",
            "&usrid=|channel_id=",
            session.channelId,
            "|user_id=",
            session.userId,
            "|chat_id=",
            chat_id,
        ];
            const response = await ctx.http.get(apiAddress + userText + session_id);
            const responseWithSpaces = response.replace(/[\u4e00-\u9fa5]+/g, ' ');
        if (config.send_glmmtg_response) {
            await session.send(`${config.prefix} ${responseWithSpaces}`);
        }
            await session.execute(`${config.prefix} "${responseWithSpaces}"`);
        await ctx.http.get(apiAddress + "clear" + session_id, {
            responseType: "text",
        });
    });
}
