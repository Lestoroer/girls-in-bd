let MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

const baseData = require('./BaseData.js');

// Обновляет различные данные с определенном промежутком времени
class Updater {
	constructor () {

	}

	usersArray (time) {
		setInterval(()=> {
			baseData.users.find({uid : {$exists: 1}, hidden: {$exists: 0} }).toArray((error, docs)=>{
				baseData.users_array = docs;
			});
		}, time);
	}
}

const updater = new Updater();

module.exports = updater;