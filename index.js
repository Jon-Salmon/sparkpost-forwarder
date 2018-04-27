#!/usr/bin/env nodejs

let config = require('config'),
  express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  SparkPost = require('sparkpost'),
  sp = new SparkPost(config.get('keys.SPARKPOST_API_KEY'));

app.use(bodyParser.json());
// Default of 100k might be too small for many attachments
app.use(bodyParser.json({
  limit: '10mb'
}));

if (!config.has('keys.SPARKPOST_API_KEY')) {
  console.error('SPARKPOST_API_KEY must be set');
  process.exit(1);
}

if (!config.has('route.FORWARD_FROM')) {
  console.error('FORWARD_FROM must be set');
  process.exit(1);
}

if (!config.has('route.FORWARD_TO')) {
  console.error('FORWARD_TO must be set');
  process.exit(1);
}



app.get('/', (req, res) => res.send('Hello World'))

app.post('/messages', (request, response) => {
  try {
    let data = JSON.parse(JSON.stringify(request.body)),
      message = data[0].msys.relay_message.content.email_rfc822,
      token = request.get('X-MessageSystems-Webhook-Token'),
      from = config.route.FORWARD_FROM;

    if (token !== config.AUTH_TOKEN) {
      return response.status(503).send('Unorthorised request');
    }

    if (message.match(/^From:\s?([\w\s]+)?<[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+>$/m)) {
      from = message.match(/^From:\s?([\w\s]+)?<[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+>$/m)[1].trim() + '<' + config.route.FORWARD_FROM + '>';
    }

    if (message.match(/^Reply-To: .*$/m)) {
      message = message.replace(/^From: .*$/m, 'From: ' + from);
    } else {
      message = message.replace(/^From: .*$/m,
        'From: ' + from +
        '\r\nReply-To: ' + data[0].msys.relay_message.friendly_from);
    }

    message = message.replace(/Sender: .*\r\n/, '');

    sp.transmissions.send({
      content: {
        email_rfc822: message
      },
      recipients: [{
        address: {
          email: config.route.FORWARD_TO
        }
      }],
      open_tracking: false,
      click_tracking: false
    }, function(err, res) {
      if (err) {
        console.error('Transmission failed: ' + JSON.stringify(err));
        return response.status(500).send('Transmission error');
      } else {
        console.log('Transmission succeeded: ' + JSON.stringify(res.body));
      }
    });

    return response.status(200).send('OK');
  } catch (e) {
    return response.status(400).send('Invalid data');
  }
});

app.listen(config.get('server.PORT'), () => console.log('Example app listening on port ' + config.server.PORT))