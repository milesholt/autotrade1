var actions = {};
var core;
var lib;
var moment;
var cloud;
var log;

const { from, range } = require("rxjs");
const { map, filter } = require("rxjs/operators");

const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require("@google/generative-ai");

/*

REQUIRE

*/

actions.require = async function () {
  core = require.main.exports;
  lib = core.lib.actions;
  moment = core.moment;
  cloud = core.cloudHandler.actions;
  log = core.log.actions;
};

/*

GEMINI PRO

*/

actions.useGeminiPro = async function (
  input = "",
  format = "text",
  attempt = 0,
) {
  const prompt = input;
  this.generating = true;
  this.generated = false;
  // Gemini Client
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINIAPI);

  const generationConfig = {
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
    maxOutputTokens: 100,
  };
  const model = genAI.getGenerativeModel({
    model: "gemini-pro",
    ...generationConfig,
  });

  //let result = null;
  let res = "";
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;

    //if (format == 'text')
    res = response.candidates?.[0].content.parts[0].text || response.text();

    /*if (format == 'json') {
    res = await this.cleanJsonResponse(
      response.candidates?.[0].content.parts[0].text || response.text(),
    );

    if (res == null) {
      //Sometimes the json returns broken. Try three times before failing
      if (attempt < 3) {
        attempt++;
        this.useGeminiPro(prompt, format, attempt);
        this.message = 'Hold on...';
      } else {
        this.message = 'AI failed. Try again?';
      }
    } else {
      this.generated = true;
      this.generating = false;
    }
  }*/

    //if (res == null)
    //res = response.candidates?.[0].content.parts[0].text || response.text();
    this.message = "";
    return res;
  } catch (e) {
    console.log("Error with Gemini API");
    //console.log(e);
    //429 too many requests
    console.log(e.status);
    console.log(e.statusText);
    //e.status
    //e.statusText
    return null;
  }
};

module.exports = {
  actions: actions,
};
