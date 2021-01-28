const WebSocket = require('ws');
const short = require('short-uuid');

var request = require('request');
const connections = {};

const querystring = require('querystring');
const https = require('https')
const http = require('http');

const server = http.createServer();

var express = require('express');
var app = express();


const send = (connectionId, data) => {
  const connection = connections[connectionId];
  connection.send(data);
}
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

//three routes connect,disconnect & default

const defaultActions = {
  connect: (connection,request) => {
    //send a post to 8032 with a connection id and auth header
    const id = short.generate();
    connection.connectionId = id
    try {
      var postData = JSON.stringify({ "connectionId":id,
        "authorization":request.headers.authorization})
        var options = {
          hostname: 'localhost',
          port: 8032,
          path: '/',
          method: 'POST',
          headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
             }
        };
      var req = https.request(options, (res) => {
          console.log('statusCode:', res.statusCode);
          console.log('headers:', res.headers);

          res.on('data', (d) => {
            process.stdout.write(d);
          });
        });

        req.on('error', (e) => {
          console.error(e);
        });


      req.write(postData);
      req.end();
      console.log("i sent a post");
  } catch (ex) {
    console.error(ex);
    connection.send(`Bad Request format, use: '{"action": ..., "data": ...}'`);
  }
    connections[id] = connection;
    console.log(`client connected with connectionId: ${id}`);
    return id;

  },
  disconnect: (connectionId) => {
    //delete connections[connectionId];
    console.log(`client disconnected with connectionId: ${connectionId}`);
    //customActions.disconnect && customActions.disconnect(connectionId);
  },
  default: (connectionId, message) => {
  //send a put on 8032 
    var postData = JSON.stringify({ "connectionId":connectionId,
                                  "body":message });
          var options = {
            hostname: 'localhost',
            port: 8032,
            path: '/',
            method: 'PUT',
            headers: {
                  'Content-Type': 'application/json',
                 'Content-Length': postData.length
               }
          };
        var req = https.request(options, (res) => {
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);

            res.on('data', (d) => {
              process.stdout.write(d);
            });
          });

          req.on('error', (e) => {
            console.error(e);
          });


        req.write(postData);
        req.end();
    //customActions.default ? customActions.default(connectionId) : send(connectionId, message);
  },
};

const customActions = {
  echo: (connectionId, data) => {
    send(connectionId, data);
  }
};

const wss = new WebSocket.Server({ port: 9000 });
let socketTemp;
wss.on('connection', (socket,request) => {
  id = defaultActions.connect(socket, request);
  socketTemp = socket;
  socket.on('message', messageJson => {
    console.log(`Received: ${messageJson}`);
    defaultActions.default(socket.connectionId, messageJson);
  });
  socket.on('close', () => {
    defaultActions.disconnect(socket.connectionId);
  });
});

console.log(`Listening on ws://localhost:9000`);

//to listen back reply from server to api gateway

app.route('/@connections/:id')
.get(function(req, res) {
    res.send('Get the article');
})
.post(function(req, res) {
    
    let data = '';
    req.on('data', (chunk) => {
      data+=chunk;
    });
    req.on('end', function() {
      console.log("data is ",data);
      var payload = {
        connectionId:socketTemp.connectionId,
        body:data
      };
      socketTemp.send(data);
    });
    
    res.sendStatus(200);
})
.put(function(req, res) {
    res.send('Update the article');
});

app.use(function(req, res, next) {
    res.status(404).send("Sorry, that route doesn't exist. Have a nice day :)");
});

app.listen(5000, function () {
    console.log('Example app listening on port 5000.');
});
