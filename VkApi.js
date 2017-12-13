const request = require('request');
const baseData = require('./BaseData.js');
const filters = require('./Filters.js');
const VK = require('VkApi');

const vk = new VK({'mode' : 'oauth'});
vk.setToken( { token :'fe1643d8868349294095264ff26a97a747528cc708b44068b6577e68ea0134279e8d5faaf8a6ef25126a9' });

class VkApi {
	constructor() {
		this.users; // Array юзеров
        this._handlers = {}; // Активные обработчики

       /* Количество запрешенных групп
		* Значение абсолютное. Если было уже загруженно 20 групп, и переменная примет
		* значение 20, то код ничего не загрузит. Нужно указать 30 и тогда загрузятся оставшиеся 10.
		* 
       */
       this.req_groups_count = 1;
	}
	// Делает запрос к vk api
	request(url, parameters, callback) {
		vk.request(url, parameters);
		this.callback = callback;
		this.on(url);
	}
	// Вешает один обработчик на определенный url
	on(url) {
		if (this._handlers[url]) return; // Если уже есть такой обработчик, то не вешать
		this._handlers[url] = 1;
		vk.on(`done:${url}`, (respond) => {
			this.callback(respond);
		});
	}
	/* Взять всех пользователей определенной группы
	 * Использовать этот метод нецелесообразно из-за отсутствия параметров в запросе from_age, to_age (огранич. vk)
	 * @param|group_id {number}: id группы
 	 * @param|offset {number}: сдвиг запроса
 	 * @param|count {number}: количество вытягиваемых пользователей (максимум 1000, ограничение вк)
 							 используем @param|offset для обхождения этой проблемы
	*/
	getAllMembers(group_id, offset=baseData._members_count, count=1000) {
		this.request('groups.getMembers', {
			group_id : group_id,
			offset : offset,
            count : count,
            sort : 'id_desc', // в порядке убывания id
			fields : filters.parameters.fields
		}, this.handlerMembers.bind(this, group_id, offset, count));
	}
	/* Обрабатывает данные с сервера
	 * @param|respond {object}: ответ от сервера
	*/
	handlerMembers(group_id, offset, count, respond) {
		let response = respond.response;
		let users_array = response.users;

		this.getSubscriptions(users_array, 0, group_id, offset, count);

		/* Выгрузит 1000 пользователей
		 * Для снятия ограничения удалить второе условие, тогда выгрузит всех.
		*/
		if (count >= response.count ||
			count >= baseData._members_count + 1000) {
			return console.log("That's all");
		}

		// this.users = filters.filterUsers(users);
		// baseData.recordArray('uid', this.users);
		// this.getAllMembers(group_id, count, count - offset);
		
	}

	/*
	* Вытаскивает по 1000 юзеров из группы
	* Параметра offset нет, т.к. из-за ограничения движка vk, нам не могут отдать
	* кол-во чего-либо более, чем 1000, следовательно, он бессмыслен
	* @param|_groups_array {array}: Массив id групп
	* @param|_index_groups {number}: Индекс запрашеваемой группы
	* @param|age_from {number}: возраст от
	* @param|age_to {number}: возраст до
	*/
	searchUsers(_groups_array, _index_groups, age_from=filters.parameters.min_age_to, age_to=filters.parameters.min_age_to) {
		this.request('users.search', { 
            count : 1000,
            group_id : _groups_array[_index_groups], // Получаем группу из массива групп
            city : filters.parameters.city,
            sort : 1, // По дате регистрации
			fields : filters.parameters.fields,
			sex : filters.parameters.search_sex,
			age_from : age_from,
			age_to : age_to,
			has_photo : filters.parameters.has_photo
		}, this.handlerSearchUsers.bind(this, _groups_array, _index_groups, age_from, age_to));
	}

	handlerSearchUsers(_groups_array, _index_groups, age_from, age_to, respond) {
		let users = respond.response;

		if (_index_groups >= _groups_array.length ||
			_index_groups >= this.req_groups_count) return console.log('Thats all');

		if (users) {
			/* Удаляем первый элемент массива, т.к. вк возвращает массив, где первый элемент это
			   (количество групп)
			*/
			let users_count = users.unshift();
			if (users_count != 0) {
				//??? Здесь нужно написать обработчик ошибки (когда нас забанили)
				/*  Передаем age_from, чтобы записать возраст пользователя
					Мы могли бы записать только возвращаемую вк дату: 'bdate', но этого недостаточно
					Дело в том, что многие пользователи убирают год в bdate и мы не значем его возраст
					Однако, если мы используем в параметре запроса age_from, age_to в методе users.Search
					Вк нам возращает предполагаемых пользователей, возраст которых соответствует нашему запросы
					Возвращаемые пользователи могут не соответствовать искомому возрасту, но он, как правило 
					В диапазоне -+ 2 года. Таким образом, мы вытягиваем гораздо больше пользователей и знаем их
					примерный возраст.
				*/
				console.log(users.length);
				users = filters.filterUsers(users, age_from);
				if (users.length != 0) baseData.recordArray('uid', users);
				/*  В фильтрах задаются параметры max_age_to, min_age_to
					Это нужно для вытягивания из группы диапазона по возрасту
					Например, 18-22 года.
				*/
				if (age_to < filters.parameters.max_age_to) {
					age_to++; age_from++;
					// Каждый раз сохраняем уже пройденную группу, чтобы потом ее не парсить снова
					baseData.update({_settings: '_settings'}, { $set: {_index_groups : _index_groups} }, {upsert: true});
				} else {
					age_to = filters.parameters.min_age_to; age_from = filters.parameters.min_age_to;
					_index_groups++;
				}

				this.requestTimeout(this.searchUsers.bind(this,_groups_array, _index_groups, age_from, age_to));
			}
			return;
		} 
		return console.log('Ошибка запроса на получение пользователей');
	}

	// groupsSearch(search_field) {
	// 	this.request('groups.search', search_field, this.handlerGroupsSearch.bind(this));
	// }

	// handlerGroupsSearch(respond) {
	// 	let groups = respond.response;
	// 	let groups_count = groups.unshift();
	// 	if (groups_count == 0) {
	// 		baseData.update({_groups: '_groups'}, { $set: { $push: { groups_array: groups} }}, {upsert: true});
	// 	}
	
	// }
	/*
	 * Вытаскивает фото для каждого пользователя
	 * Параметра offset нет, т.к. из-за ограничения движка vk, нам не могут отдать
	 * кол-во чего-либо более, чем 1000, следовательно, он бессмыслен	* @param|_groups_array {array}: Массив id групп
	 * @param|users {array}: Массив пользователей
	 * @param|_index_photos {number}: Индекс запрашиваемого пользователя из массива
	*/
	getPhotos(users, _index_photos=baseData._index_photos) {
		this.request('photos.getAll', {
			owner_id : users[_index_photos].uid, // Для каждого пользователя запрашиваем фотографии
			//offset : offset,
            count : 60 // Вытягиваем 60 фотографий
		}, this.handlerPhotos.bind(this, users, _index_photos));
	}

	handlerPhotos(users, _index_photos, respond) {

		if (respond.error)  { 
			//_index_photos++;
			return this.requestTimeout(this.getPhotos.bind(this, users, _index_photos));
		}
		// Вытягиваем n-кол-во пользователей
		if (_index_photos >= users.length ||
			_index_photos >= 12000) return console.log('Thats all'); // Количество групп

		let photos = [];
		let ph = ['src_xxxbig', 'src_xxbig', 'src_xbig', 'src_big']; // нас интересуют только большие размеры фотографий
		let response = respond.response;

		// Собираем массив фотографий для записи в бд
		for (let i = 0; i < response.length; i++) {
			if (typeof(response[i]) == 'object') {
				label:for (let k = 0; k < ph.length; k++) {
					if (response[i][ph[k]]) {
						photos.push({
							src: response[i][ph[k]],
							date : response[i]['created']
						});
						break label;
					}
				}
			}
		}
		console.log(photos.length); // Выводим в консоль, дабы видеть процесс 
		// Заливаем фотки юзеру
		baseData.update({uid: users[_index_photos].uid}, { $set: {'photos' : photos}}, {upsert: true});
		_index_photos++;
		// Обновляем индекс
		baseData.update({_settings: '_settings'}, { $set: {_index_photos : _index_photos} }, {upsert: true});
		this.requestTimeout(this.getPhotos.bind(this, users, _index_photos));
	}

	getSubscriptions(users_array, index, group_id, offset, count) {
		this.request('users.getSubscriptions', {
			user_id : users_array[index]['uid']
		}, this.handlerSubscriptions.bind(this, users_array, index, group_id, offset, count));
	}

	handlerSubscriptions(users_array, index, group_id, offset, count, respond) {
		let response = respond.response;

		if (response) {
			let groups = response.groups;
			let users = response.users;

			if (groups.items.length > 0) {
				console.log(groups.items.length); 
				// Добавляем группы без дублирования id
				baseData.update({_groups : '_groups'}, {$addToSet:  { _groups_array: {$each : groups.items} }}, {upsert:true});
			}
			if (index == users_array.length - 1) return;
		}

		index++;
		this.requestTimeout(this.getSubscriptions.bind(this, users_array, index, group_id, offset, count));
	}

	// Существует ограничение на запрос к api_vk: 3 запроса в секунду.
	// Поэтому здесь 400ms
	requestTimeout(callback) {
		setTimeout(() => {
			callback();
		}, 400);
	}
}

const vkapi = new VkApi();
module.exports = vkapi;


setTimeout( ()=>{
	vkapi.searchUsers(baseData._groups_array, baseData._index_groups);
	//vkapi.getAllMembers(61560900);
	// vkapi.getAllMembers(61560900);
	// vkapi.getAllMembers(61560900);
}, 600);



// Прототип нейронной сети, не трогать
let data = {
		lvl : 20,
		groups : 1,
		relation : 0
	}

let weigth = {}
let hidden = {}
let output = { 'output': 0 }

let input_count = 3;
let hidden_count = 3;
let output_count = 1;

let error = 1;

let weigth_count = input_count * hidden_count + hidden_count * output_count;

function init(data, w) {

	for (let k = 0; k < hidden_count; k++) {
		let sum = 0;
		for (let param in data) {
			if (w) weigth[param + k] = w;
			sum += data[param] * weigth[param + k];
		}
		hidden['hidden' + k] = sigmoid(sum);

		if (w) weigth['hidden_output' + k] = w;
		output['output'] += weigth['hidden_output' + k] * hidden['hidden' + k];
	}

	output['output'] = sigmoid(output['output']);
	error = (Math.pow((1-output['output']), 2))/1;

}

function sigmoid(number) {
	return 1/(1 + Math.exp(-number));
}

init(data, Math.random());

let array = [];

for (let i = 0; i < 1000; i++) {
	let lvl = 17;
	let groups = 1;
	let relation = 0;

	if (i%2 == 0) {
		lvl = 18;
		relation = 2;
	} else if (i%3 == 0) {
		lvl = 22;
		groups = 0;
		relation = 1;
	} else if (i%4 == 0) {
		lvl = 19;
		relation = 2;
	} else if (i%6 == 0) {
		lvl = 20;
		groups = 0;
		relation = 0;
	}

	array.push ({
		lvl : lvl,
		groups : groups,
		relation : relation
	});
}

const E = 0.7;
const A = 0.3;

for (let i = 0; i < array.lenght; i++) {
	let output_delta = getOutputDelta();
	for (let k = 0; k < hidden_count; k++) {
		let hidden = hidden['hidden' + k];
		let weigth = weigth['hidden_output' + k];
		let hidden_delta = getHiddenDelta(hidden, weigth, output_delta);
		let GRAD = getGRAD(hidden, output_delta);
		weigth['hidden_output' + k] = recalculateWeigth(GRAD, weigth);
	}

	init(array[i]);
}

let output_ideal = 0.8;

function getOutputDelta() {
	return (output_ideal - output['output']) * ((1 - output['output'])*output['output']);
}

function getHiddenDelta(hidden, weigth, output_delta) {
	return ((1 - hidden) * hidden) * (weigth * output_delta)
}

function getGRAD() {
	return hidden * output_delta;
}

function recalculateWeigth(GRAD, weigth) {
	return E * GRAD + weigth * A;
}
 





