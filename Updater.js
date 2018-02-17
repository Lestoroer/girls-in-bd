let MongoClient = require('mongodb').MongoClient
  , assert = require('assert');

const baseData = require('./BaseData.js');
const filters = require('./Filters.js');

// Обновляет различные данные с определенном промежутком времени
class Updater {
	constructor () {

	}

	usersArray (time) {

		setInterval(()=> {
			console.log('run');
			baseData.users.find({
				uid : {$exists: 1}, 
				hidden: {$exists: 0},
				'followers.people' : { $exists: 1} ,
				'friends.people' : { $exists: 1} ,
				'groups' : { $exists: 1} ,
			}).toArray((error, docs)=> {
				let array_new = [];
				for (let i = 0; i < docs.length; i++) {
					if (
						docs[i].groups.length > 500 ||
						docs[i].friends.count > 291 ||
						docs[i].followers.count > 551 ||
						!filters.checkUserByBlackList(docs[i].groups)) continue;

					array_new.push(docs[i]);
				}
				console.log(docs.length, array_new.length);
				baseData.users_array = array_new;
				array_new = null;
				
			});
			
		}, time);
	}
}

const updater = new Updater();

module.exports = updater;

