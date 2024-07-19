var nodemailer = require("nodemailer");
var actions = {};

let transporter = nodemailer.createTransport({
  host: "mboxhosting.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "contact@milesholt.co.uk",
    pass: process.env.MAIL_PASSWORD,
  },
});

//Example
// var mailOptions = {
//   from: 'contact@milesholt.co.uk',
//   to: 'miles_holt@hotmail.com',
//   subject: 'Sending Email using Node.js',
//   text: 'That was easy!'
// };
// sendMail(mailOptions);

actions.sendMail = function (mailOptions) {
  sendMail(mailOptions, true);
};

async function sendMail(mailOptions, tryagain) {
  //overide some Parameters
  mailOptions.from = '"Miles Holt" <contact@milesholt.co.uk>';
  mailOptions.to = "miles_holt@hotmail.com";
  //ensure text and html are not objects
  mailOptions.text = JSON.stringify(mailOptions.text);
  mailOptions.html = JSON.stringify(deepCopy(mailOptions.text));

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error - Sending mail failed. Error message: ");
      //console.log(error);

      if (tryagain) {
        console.log("Waiting 10 seconds, then trying again...");
        setTimeout(() => {
          sendMail(mailOptions, false);
        }, 10000);
      } else {
        console.log("Tried to send email again failed. Giving up.");
      }
    } else {
      console.log("Email sent: " + info.response);
    }
  });
}

function deepCopy(origObj) {
  var newObj = origObj;
  if (origObj && typeof origObj === "object") {
    newObj =
      Object.prototype.toString.call(origObj) === "[object Array]" ? [] : {};
    for (var i in origObj) {
      newObj[i] = deepCopy(origObj[i]);
    }
  }
  return newObj;
}

module.exports = {
  actions: actions,
};
