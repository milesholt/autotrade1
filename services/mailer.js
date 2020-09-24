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
  sendMail(mailOptions,true);
}

async function sendMail(mailOptions,tryagain){
  //overide some Parameters
  mailOptions.from = '"Miles Holt" <contact@milesholt.co.uk>';
  mailOptions.to = "miles_holt@hotmail.com"
  mailOptions.html = mailOptions.text;

  await transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log('Error - Sending mail failed. Error message: ');
      console.log(error);

      if(tryagain){
        console.log('Waiting 10 seconds, then trying again...');
        setTimeout(()=>{ sendMail(mailOptions,false); },10000);
      } else {
        console.log('Tried to send email again failed. Giving up.');
      }

    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

module.exports = {
  actions: actions
}
