var actions = {};
var core;
var mailer;
var testmailer;

/*

REQUIRE

*/

actions.require = async function(){
  core = require.main.exports;
  mailer = core.mailer.actions;
}


/*

NOTIFY
Handle notifications here

*/

actions.notify = async function(notification, msg = ''){

  //main structure of notification
  let options = {
    title: '',
    content: msg
  }

  switch(notification){
    case 'deal-success':
      options.title = 'Trade made. ' + epic;
    break;
    case 'deal-rejected':
      options.title = 'Deal rejected. ' + epic;
    break;
    case 'deal-ticket-error':
      options.title = 'Deal ticket error. ' + ecpic;
    break;
    case 'trade-being-made':
      options.title = 'Trade being made. ' + epic;
    break;
  }

  await actions.sendNotification(options);
}

/*

SEND NOTIFICATION
Method for sending notification

*/

actions.sendNotification = async function(options, method = 'mail'){

  //Default method is mail
  //Other methods by which to notify will go here

  console.log('sending notification:');

  if(method == 'mail'){
    var mailOptions = {
      subject: options.title,
      text: options.content
    };
    await mailer.sendMail(mailOptions);
  }

}


module.exports = {
  actions: actions
}
