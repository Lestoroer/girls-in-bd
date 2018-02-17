const request = require('request');

const express = require('express');
const bodyParser = require('body-parser');
const exphbs  = require('express-handlebars');
const app = express();

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.engine('handlebars', exphbs({
	defaultLayout: 'home',
	partialsDir: __dirname + '/views/partials/',
	helpers: {
		value_at: (obj, param) => {
			if (!obj) return 'Error.';
			return obj[param];
		},
		in: (obj) => {
			try {
				return JSON.stringify(obj);
			} catch (error) {
				return 'ERROR';
			}
		},
	}
}));


app.use(express.static(__dirname + "/public", {
	etag: false,
	setHeaders: function(res, path) {
	    res.setHeader('Cache-Control', 'no-cache')
	 },
	 maxage: 0
}));

app.set('views', __dirname + '/views/layouts');
app.set('view engine', 'handlebars');


const filters = require('./Filters.js');
const handlerError = require('./HandlerError.js');
const baseData = require('./BaseData.js');
const vkapi = require('./VkApi.js');
const updater = require('./Updater.js');

// Запускаем обновление users array
updater.usersArray(30000);


app.get('/', function (req, res) {
  	res.render('home');
});

app.get('/users', function (req, res) {
	res.send(baseData.users_array);
});

app.post('/user_hidden', function (req, res) {
	if (req.body.uid) {
		baseData.update({uid: +req.body.uid}, { $set: {hidden : 1} }, {upsert: true});
		res.send('ok');
	} else {
		res.status = 400;
		res.send('Bad Request');
	}
});

app.listen(5000);