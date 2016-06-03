'use strict';
/* global process */
/* global __dirname */
/*******************************************************************************
 * Copyright (c) 2015 IBM Corp.
 *
 * All rights reserved. 
 *
 * Contributors:
 *   David Huffman - Initial implementation
 *******************************************************************************/
/////////////////////////////////////////
///////////// Setup Node.js /////////////
/////////////////////////////////////////
var express = require('express');
var session = require('express-session');
var compression = require('compression');
var serve_static = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var app = express();
var url = require('url');
var setup = require('./setup');
var cors = require('cors');

//// Set Server Parameters ////
var host = setup.SERVER.HOST;
var port = setup.SERVER.PORT;

////////  Pathing and Module Setup  ////////
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.engine('.html', require('jade').__express);
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded()); 
app.use(cookieParser());
app.use('/cc/summary', serve_static(path.join(__dirname, 'cc_summaries')) );												//for chaincode investigator
app.use( serve_static(path.join(__dirname, 'public'), {maxAge: '1d', setHeaders: setCustomCC}) );							//1 day cache
//app.use( serve_static(path.join(__dirname, 'public')) );
app.use(session({secret:'Somethignsomething1234!test', resave:true, saveUninitialized:true}));
function setCustomCC(res, path) {
	if (serve_static.mime.lookup(path) === 'image/jpeg')  res.setHeader('Cache-Control', 'public, max-age=2592000');		//30 days cache
	else if (serve_static.mime.lookup(path) === 'image/png') res.setHeader('Cache-Control', 'public, max-age=2592000');
	else if (serve_static.mime.lookup(path) === 'image/x-icon') res.setHeader('Cache-Control', 'public, max-age=2592000');
}
// Enable CORS preflight across the board.
app.options('*', cors());
app.use(cors());

///////////  Configure Webserver  ///////////
app.use(function(req, res, next){
	var keys;
	console.log('------------------------------------------ incoming request ------------------------------------------');
	console.log('New ' + req.method + ' request for', req.url);
	req.bag = {};											//create my object for my stuff
	req.bag.session = req.session;
	
	var url_parts = url.parse(req.url, true);
	req.parameters = url_parts.query;
	keys = Object.keys(req.parameters);
	if(req.parameters && keys.length > 0) console.log({parameters: req.parameters});		//print request parameters
	keys = Object.keys(req.body);
	if (req.body && keys.length > 0) console.log({body: req.body});						//print request body
	next();
});

//// Router ////
app.use('/', require('./routes/site_router'));

////////////////////////////////////////////
////////////// Error Handling //////////////
////////////////////////////////////////////
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
app.use(function(err, req, res, next) {		// = development error handler, print stack trace
	console.log('Error Handeler -', req.url);
	var errorCode = err.status || 500;
	res.status(errorCode);
	req.bag.error = {msg:err.stack, status:errorCode};
	if(req.bag.error.status == 404) req.bag.error.msg = 'Sorry, I cannot locate that file';
	res.render('template/error', {bag:req.bag});
});

// ============================================================================================================================
// 														Launch Webserver
// ============================================================================================================================
var server = http.createServer(app).listen(port, function() {});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_ENV = 'production';
server.timeout = 240000;																							// Ta-da.
console.log('------------------------------------------ Server Up - ' + host + ':' + port + ' ------------------------------------------');
if(process.env.PRODUCTION) console.log('Running using Production settings');
else console.log('Running using Developer settings');

// ============================================================================================================================
// 														Deployment Tracking
// ============================================================================================================================
console.log('- Tracking Deployment');
require('cf-deployment-tracker-client').track();		//reports back to us, this helps us judge interest! feel free to remove it

// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================
// ============================================================================================================================

// ============================================================================================================================
// 														Warning
// ============================================================================================================================

// ============================================================================================================================
// 														Entering
// ============================================================================================================================

// ============================================================================================================================
// 														Test Area
// ============================================================================================================================
var part1 = require('./utils/ws_part1');
var part2 = require('./utils/ws_part2');
var ws = require('ws');
var wss = {};
var Ibc1 = require('ibm-blockchain-js');
var ibc = new Ibc1();

// ==================================
// load peers manually or from VCAP, VCAP will overwrite hardcoded list!
// ==================================
//this hard coded list is intentionaly left here, feel free to use it when initially starting out
//please create your own network when you are up and running
var manual ={
  "credentials": {
    "peers": [
      {
        "discovery_host": "12f87457-b12d-4988-89d9-8d6df76233c6_vp1-discovery.blockchain.ibm.com",
        "discovery_port": 30303,
        "api_host": "12f87457-b12d-4988-89d9-8d6df76233c6_vp1-api.blockchain.ibm.com",
        "api_port_tls": 443,
        "api_port": 80,
        "type": "peer",
        "network_id": "12f87457-b12d-4988-89d9-8d6df76233c6",
        "container_id": "a2e79898de126b40ee2ce5367112d63ea6be2f9168b1716bfe2ad9e5d07acc39",
        "id": "12f87457-b12d-4988-89d9-8d6df76233c6_vp1",
        "api_url": "http://12f87457-b12d-4988-89d9-8d6df76233c6_vp1-api.blockchain.ibm.com:80"
      },
      {
        "discovery_host": "12f87457-b12d-4988-89d9-8d6df76233c6_vp2-discovery.blockchain.ibm.com",
        "discovery_port": 30303,
        "api_host": "12f87457-b12d-4988-89d9-8d6df76233c6_vp2-api.blockchain.ibm.com",
        "api_port_tls": 443,
        "api_port": 80,
        "type": "peer",
        "network_id": "12f87457-b12d-4988-89d9-8d6df76233c6",
        "container_id": "584ab60cb39a35690087cd4b64b6f6310c3c81d27c79387090a003a06bdd9520",
        "id": "12f87457-b12d-4988-89d9-8d6df76233c6_vp2",
        "api_url": "http://12f87457-b12d-4988-89d9-8d6df76233c6_vp2-api.blockchain.ibm.com:80"
      }
    ],
    "ca": {
      "12f87457-b12d-4988-89d9-8d6df76233c6_ca": {
        "url": "12f87457-b12d-4988-89d9-8d6df76233c6_ca-api.blockchain.ibm.com:30303",
        "discovery_host": "12f87457-b12d-4988-89d9-8d6df76233c6_ca-discovery.blockchain.ibm.com",
        "discovery_port": 30303,
        "api_host": "12f87457-b12d-4988-89d9-8d6df76233c6_ca-api.blockchain.ibm.com",
        "api_port_tls": 30303,
        "api_port": 80,
        "type": "ca",
        "network_id": "12f87457-b12d-4988-89d9-8d6df76233c6",
        "container_id": "e89d860fa53ab93cf0d509b2ffbd954c96d467582845394843e55de948c26a14"
      }
    },
    "users": [
      {
        "username": "dashboarduser_type0_f38b1bf66d",
        "secret": "fde769b133",
        "enrollId": "dashboarduser_type0_f38b1bf66d",
        "enrollSecret": "fde769b133"
      },
      {
        "username": "dashboarduser_type0_b845cff49c",
        "secret": "0d947860e0",
        "enrollId": "dashboarduser_type0_b845cff49c",
        "enrollSecret": "0d947860e0"
      },
      {
        "username": "user_type1_6e9bf964a8",
        "secret": "4774d10c0a",
        "enrollId": "user_type1_6e9bf964a8",
        "enrollSecret": "4774d10c0a"
      },
      {
        "username": "user_type1_304ae53c59",
        "secret": "51625f4870",
        "enrollId": "user_type1_304ae53c59",
        "enrollSecret": "51625f4870"
      },
      {
        "username": "user_type1_22ccfd91f3",
        "secret": "d8624d59a1",
        "enrollId": "user_type1_22ccfd91f3",
        "enrollSecret": "d8624d59a1"
      },
      {
        "username": "user_type1_5a0157defa",
        "secret": "0a1d342f65",
        "enrollId": "user_type1_5a0157defa",
        "enrollSecret": "0a1d342f65"
      },
      {
        "username": "user_type1_b538d42dd0",
        "secret": "70709bc49a",
        "enrollId": "user_type1_b538d42dd0",
        "enrollSecret": "70709bc49a"
      },
      {
        "username": "user_type2_92696f1724",
        "secret": "1b4a497a92",
        "enrollId": "user_type2_92696f1724",
        "enrollSecret": "1b4a497a92"
      },
      {
        "username": "user_type2_34c7c1c310",
        "secret": "70fb16ff93",
        "enrollId": "user_type2_34c7c1c310",
        "enrollSecret": "70fb16ff93"
      },
      {
        "username": "user_type2_072b711435",
        "secret": "ee6d52c7c3",
        "enrollId": "user_type2_072b711435",
        "enrollSecret": "ee6d52c7c3"
      },
      {
        "username": "user_type2_fbb02ccf17",
        "secret": "3f9b26d63d",
        "enrollId": "user_type2_fbb02ccf17",
        "enrollSecret": "3f9b26d63d"
      },
      {
        "username": "user_type2_33758a2017",
        "secret": "66e17d92ab",
        "enrollId": "user_type2_33758a2017",
        "enrollSecret": "66e17d92ab"
      },
      {
        "username": "user_type4_407c062a4c",
        "secret": "7529db1153",
        "enrollId": "user_type4_407c062a4c",
        "enrollSecret": "7529db1153"
      },
      {
        "username": "user_type4_3fe7305783",
        "secret": "117679fc1a",
        "enrollId": "user_type4_3fe7305783",
        "enrollSecret": "117679fc1a"
      },
      {
        "username": "user_type4_400ac0801c",
        "secret": "b616c4b3ff",
        "enrollId": "user_type4_400ac0801c",
        "enrollSecret": "b616c4b3ff"
      },
      {
        "username": "user_type4_ea5a21e920",
        "secret": "dd2d813a68",
        "enrollId": "user_type4_ea5a21e920",
        "enrollSecret": "dd2d813a68"
      },
      {
        "username": "user_type4_a28df9c3d6",
        "secret": "a6e08da792",
        "enrollId": "user_type4_a28df9c3d6",
        "enrollSecret": "a6e08da792"
      },
      {
        "username": "user_type8_966cc880bc",
        "secret": "f46045e839",
        "enrollId": "user_type8_966cc880bc",
        "enrollSecret": "f46045e839"
      },
      {
        "username": "user_type8_1d057cfa3c",
        "secret": "4492def893",
        "enrollId": "user_type8_1d057cfa3c",
        "enrollSecret": "4492def893"
      },
      {
        "username": "user_type8_b8b60ccd02",
        "secret": "32d4b350ee",
        "enrollId": "user_type8_b8b60ccd02",
        "enrollSecret": "32d4b350ee"
      },
      {
        "username": "user_type8_1424f39085",
        "secret": "58bb540a61",
        "enrollId": "user_type8_1424f39085",
        "enrollSecret": "58bb540a61"
      },
      {
        "username": "user_type8_c0f9453a3b",
        "secret": "578561c6fa",
        "enrollId": "user_type8_c0f9453a3b",
        "enrollSecret": "578561c6fa"
      }
    ]
  }
};
var peers = manual.credentials.peers;
console.log('loading hardcoded peers');
var users = null;																		//users are only found if security is on
if(manual.credentials.users) users = manual.credentials.users;
console.log('loading hardcoded users');

if(process.env.VCAP_SERVICES){															//load from vcap, search for service, 1 of the 3 should be found...
	var servicesObject = JSON.parse(process.env.VCAP_SERVICES);
	for(var i in servicesObject){
		if(i.indexOf('ibm-blockchain') >= 0){											//looks close enough
			if(servicesObject[i][0].credentials.error){
				console.log('!\n!\n! Error from Bluemix: \n', servicesObject[i][0].credentials.error, '!\n!\n');
				peers = null;
				users = null;
				process.error = {type: 'network', msg: 'Due to overwhelming demand the IBM Blockchain Network service is at maximum capacity.  Please try recreating this service at a later date.'};
			}
			if(servicesObject[i][0].credentials && servicesObject[i][0].credentials.peers){
				console.log('overwritting peers, loading from a vcap service: ', i);
				peers = servicesObject[i][0].credentials.peers;
				if(servicesObject[i][0].credentials.users){
					console.log('overwritting users, loading from a vcap service: ', i);
					users = servicesObject[i][0].credentials.users;
				} 
				else users = null;														//no security
				break;
			}
		}
	}
}

// ==================================
// configure ibm-blockchain-js sdk
// ==================================
var options = 	{
					network:{
						peers: peers,
						users: users,
						options: {quiet: true, tls:false, maxRetry: 1}
					},
					chaincode:{
						zip_url: 'https://github.com/ibm-blockchain/marbles-chaincode/archive/master.zip',
						unzip_dir: 'marbles-chaincode-master/hyperledger/part2',								//subdirectroy name of chaincode after unzipped
						git_url: 'https://github.com/ibm-blockchain/marbles-chaincode/hyperledger/part2',		//GO get http url
					
						//hashed cc name from prev deployment
						//deployed_name: '14b711be6f0d00b190ea26ca48c22234d93996b6e625a4b108a7bbbde064edf0179527f30df238d61b66246fe1908005caa5204dd73488269c8999276719ca8b'
					}
				};
if(process.env.VCAP_SERVICES){
	console.log('\n[!] looks like you are in bluemix, I am going to clear out the deploy_name so that it deploys new cc.\n[!] hope that is ok budddy\n');
	options.chaincode.deployed_name = '';
}
ibc.load(options, cb_ready);																//parse/load chaincode

var chaincode = null;
function cb_ready(err, cc){																	//response has chaincode functions
	if(err != null){
		console.log('! looks like an error loading the chaincode or network, app will fail\n', err);
		if(!process.error) process.error = {type: 'load', msg: err.details};				//if it already exist, keep the last error
	}
	else{
		chaincode = cc;
		part1.setup(ibc, cc);
		part2.setup(ibc, cc);
		if(!cc.details.deployed_name || cc.details.deployed_name === ''){					//decide if i need to deploy
			cc.deploy('init', ['99'], {save_path: './cc_summaries', delay_ms: 50000}, cb_deployed);
		}
		else{
			console.log('chaincode summary file indicates chaincode has been previously deployed');
			cb_deployed();
		}
	}
}

// ============================================================================================================================
// 												WebSocket Communication Madness
// ============================================================================================================================
function cb_deployed(e, d){
	if(e != null){
		//look at tutorial_part1.md in the trouble shooting section for help
		console.log('! looks like a deploy error, holding off on the starting the socket\n', e);
		if(!process.error) process.error = {type: 'deploy', msg: e.details};
	}
	else{
		console.log('------------------------------------------ Websocket Up ------------------------------------------');
		
		wss = new ws.Server({server: server});												//start the websocket now
		wss.on('connection', function connection(ws) {
			ws.on('message', function incoming(message) {
				console.log('received ws msg:', message);
				try{
					var data = JSON.parse(message);
					part1.process_msg(ws, data);
					part2.process_msg(ws, data);
				}
				catch(e){
					console.log('ws message error', e);
				}
			});
			
			ws.on('error', function(e){console.log('ws error', e);});
			ws.on('close', function(){console.log('ws closed');});
		});
		
		wss.broadcast = function broadcast(data) {											//send to all connections			
			wss.clients.forEach(function each(client) {
				try{
					data.v = '2';
					client.send(JSON.stringify(data));
				}
				catch(e){
					console.log('error broadcast ws', e);
				}
			});
		};
		
		// ========================================================
		// Monitor the height of the blockchain
		// ========================================================
		ibc.monitor_blockheight(function(chain_stats){										//there is a new block, lets refresh everything that has a state
			if(chain_stats && chain_stats.height){
				console.log('hey new block, lets refresh and broadcast to all');
				ibc.block_stats(chain_stats.height - 1, cb_blockstats);
				wss.broadcast({msg: 'reset'});
				chaincode.query.read(['_marbleindex'], cb_got_index);
				chaincode.query.read(['_opentrades'], cb_got_trades);
			}
			
			//got the block's stats, lets send the statistics
			function cb_blockstats(e, stats){
				if(e != null) console.log('error:', e);
				else {
					if(chain_stats.height) stats.height = chain_stats.height - 1;
					wss.broadcast({msg: 'chainstats', e: e, chainstats: chain_stats, blockstats: stats});
				}
			}
			
			//got the marble index, lets get each marble
			function cb_got_index(e, index){
				if(e != null) console.log('error:', e);
				else{
					try{
						var json = JSON.parse(index);
						for(var i in json){
							console.log('!', i, json[i]);
							chaincode.query.read([json[i]], cb_got_marble);							//iter over each, read their values
						}
					}
					catch(e){
						console.log('marbles index msg error:', e);
					}
				}
			}
			
			//call back for getting a marble, lets send a message
			function cb_got_marble(e, marble){
				if(e != null) console.log('error:', e);
				else {
					try{
						wss.broadcast({msg: 'marbles', marble: JSON.parse(marble)});
					}
					catch(e){
						console.log('marble msg error', e);
					}
				}
			}
			
			//call back for getting open trades, lets send the trades
			function cb_got_trades(e, trades){
				if(e != null) console.log('error:', e);
				else {
					try{
						trades = JSON.parse(trades);
						if(trades && trades.open_trades){
							wss.broadcast({msg: 'open_trades', open_trades: trades.open_trades});
						}
					}
					catch(e){
						console.log('trade msg error', e);
					}
				}
			}
		});
	}
}
