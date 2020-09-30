"use strict";
const nodemailer = require("nodemailer");

var actions = {};

actions.testmail = function(){
  main().catch(console.error);
}

// async..await is not allowed in global scope, must use a wrapper
async function main() {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing
  //let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "mail2.runhosting.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'contact@milesholt.co.uk',
      pass: 'Savelli_1986'
    }
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: '"Miles Holt" <contact@milesholt.co.uk>', // sender address
    to: "miles_holt@hotmail.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>" // html body
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  //console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

//main().catch(console.error);


module.exports = {
  actions: actions
}
