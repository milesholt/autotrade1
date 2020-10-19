var actions = {};
var core = require.main.exports;


/*

NOTIFY
Handle notifications here

*/

actions.notify = async function(notification, msg = ''){

  //main structure of notification
  let options = {
    title: '',
    content: core.lib.toString(msg)
  }

  switch(notification){
    case 'deal-success':
      options.title = 'Trade made. Time is - ' + fulldate + ' Trend -' + trend
    break;
    case 'deal-rejected':
      options.title = 'Deal rejected. Trade could not be made';
    break;
    case 'deal-ticket-error':
      options.title = 'Deal ticket error. Trade could not be made';
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

  if(method == 'mail'){
    var mailOptions = {
      subject: options.title,
      text: options.content
    };
    await core.mailer.actions.sendMail(mailOptions);
    await core.testmailer.actions.testMail();
  }

}


module.exports = {
  actions: actions
}
