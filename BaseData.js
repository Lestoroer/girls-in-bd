let MongoClient = require('mongodb').MongoClient
  , assert = require('assert');


class BaseData {
	constructor() {
		// Главный массив юзеров, который рендерится на фронтенд
		this.users_array = [];

		let mongo_url = 'mongodb://127.0.0.1:27017/myproject';
		MongoClient.connect(mongo_url, (error, db)=> {
			if (error) return console.log(error);
			this.db = db;
			this.users = this.db.collection('test');
			this.collection = this.users;

			this.initSetting();
			this.initGroups();

		});
	}

	// Вставляет документ настроек
	initSetting() {
		let _settings = {_settings: '_settings'};
		this.update(_settings, { $set: _settings }, {upsert: true}, ()=>{
			this.collection.find(_settings).toArray((error, docs)=> {
				if (error) return console.log(error);
				// Количество выгруженных пользователей с последней группы
				this._members_count = docs[0]._members_count ? docs[0]._members_count  : 0;
				// Последний индекс запроса на группы
				this._index_groups = docs[0]._index_groups ? docs[0]._index_groups : 0;
				// Последний индекс запроса на фото
				this._index_photos = docs[0]._index_photos ? docs[0]._index_photos : 0;
				// Последний индекс запроса интересеных страниц и групп
				this._index_subscriptions = docs[0]._index_subscriptions ? docs[0]._index_subscriptions : 0;
				// Последний индекс запроса на друзей
				this._index_freinds = docs[0]._index_freinds ? docs[0]._index_freinds : 0;
				// Последний индекс запроса на подписчиков пользователя
				this._index_followers = docs[0]._index_followers ? docs[0]._index_followers : 0;
			});
		});
	}
	// Вставляем документ групп
	initGroups() {
		this.update({_groups: '_groups'}, { $set: {_groups: '_groups'} }, {upsert: true}, ()=> {
			this.collection.find({_groups: '_groups'}).toArray((error, docs)=> {
				if (error) return console.log(error);
				/* Получаем массив групп.*/
				this._groups_array = docs[0]._groups_array ? docs[0]._groups_array : [];
			});
		});
	}

	// insert(field, callback) {
	// 	this.collection.insert(field, (error, docs)=> {
	// 		if (error) return console.log(error);
	// 		if (callback) return callback(docs);
	// 		return docs;
	// 	});
	// }

	update(selector, fields, options, callback) {
		this.collection.update(selector, fields, options, (error, docs)=> {
			if (error) return console.log(error);
			if (callback) return callback(docs);
			return docs;
		});
	}

	// Переберает массив значений и записывает в Mongo
	recordArray(value, array) {
		for (let i = 0; i < array.length; i++) {
			this.update({[value] : array[i][value]}, { $set: array[i]}, {upsert: true});
		}
	}

	// set collection (collection) {
	// 	this.collection = colection;
	// }

	// get colletion () {
	// 	return this.collection;
	// }

	removeDocument() {

	}

	checkId() {

	}

	close() {

	}
}

const baseData = new BaseData();

module.exports = baseData;