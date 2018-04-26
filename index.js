#!/usr/bin/env nodejs

require('dotenv').load();

let q = require('q'),
  express = require('express'),
  app = express(),
  bodyParser = require('body-parser'),
  SparkPost = require('sparkpost'),
  sp = new SparkPost(process.env.SPARKPOST_API_KEY);

app.use(bodyParser.json());
// Default of 100k might be too small for many attachments
app.use(bodyParser.json({
  limit: '10mb'
}));

if (process.env.SPARKPOST_API_KEY === undefined) {
  console.error('SPARKPOST_API_KEY must be set');
  process.exit(1);
}

if (process.env.FORWARD_FROM === undefined) {
  console.error('FORWARD_FROM must be set');
  process.exit(1);
}

if (process.env.FORWARD_TO === undefined) {
  console.error('FORWARD_TO must be set');
  process.exit(1);
}



app.get('/', (req, res) => res.send('Hello World'))

app.post('/messages', (req, res) => {
  let data = JSON.parse(JSON.stringify(req.body)),
    message = data[0].msys.relay_message.content.email_rfc822;
  console.log(req.body);
  console.log(message);
  return res.status(200).send('OK');
});

app.listen(process.env.PORT, () => console.log('Example app listening on port ' + process.env.PORT))