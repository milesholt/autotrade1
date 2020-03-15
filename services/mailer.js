var nodemailer = require('nodemailer');
var actions = {};

let transporter = nodemailer.createTransport({
  host: "mail2.runhosting.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'contact@milesholt.co.uk',
    pass: 'Savelli_1986'
  }
});

//Example
// var mailOptions = {
//   from: 'contact@milesholt.co.uk',
//   to: 'miles_holt@hotmail.com',
//   subject: 'Sending Email using Node.js',
//   text: 'That was easy!'
// };
// sendMail(mailOptions);

actions.sendMail = function(mailOptions){
  sendMail(mailOptions);
}

function sendMail(mailOptions){
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = {
  actions: actions
}
