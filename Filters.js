

class Filters {
	constructor() {
		this.groups_black_list = {

		}
		// Настройки запросов
		this.parameters = { 
            'fields' : `sex,last_seen,relation,country,bdate,city,followers_count,home_town,can_write_private_message`,
            'search_sex' : 1,
            'city' : 2, // 1 Москва, 2 Санкт-Петербург, 106 Оренбург
            'min_age_to' : 18, // М
            'max_age_to' : 23,
            'search_has_photo' : 1
        }
	}

	filterUsers(users, age_from) {
		let users_array = [];
		for (let i = 0; i < users.length; i++) {
			if (this.checkUserAvailable(users[i])) {
				users[i].age = age_from; // Добавляем возраст
				users_array.push(users[i]);
			}
		}
		return users_array;
	}

	filterSubscriptions(groups, users) {
		if (this.checkSubscriptionGroupsAvailable(groups) ||
			this.checkSubscriptionUsersAvailable(users)) return null;
		return true;
		// let subscriptions_array = [];
		// for (let i = 0; i < subscriptions.length; i++) {
		// 	if (this.checkSubscriptionAvailable(subscriptions[i])) {
		// 		subscriptions_array.push(subscriptions[i]);
		// 	}
		// }
		// return subscriptions_array;
	}

	checkSubscriptionUsersAvailable (users) {
		if (users.count > 170) return false;
		return true;
	}

	checkSubscriptionGroupsAvailable(groups) {
		if (groups.count > 90) return false;
		for (let i = 0; i < groups.items.length; i++) {
			if (this.groups_black_list[groups.items[i]]) return false;
		}
		return true;
	}

	checkUserAvailable(user) {
		if (user['sex'] && user['sex'] == 2 ||
			user['deactivated'] ||
			user['last_seen'] && +user['last_seen']['time'] < Date.now()/1000 - 3 * 24 * 3600 ||
			!user['can_write_private_message'] ||
			!this.checkRelation(user) ||
			!this.checkSityAndTown(user)) //|| 
		{
			return false;
		}
		return true;
	}

	checkRelation(user) {
		if ([2,3,4,5,7,8].indexOf(user['relation']) != -1) return false;
		return true;
	}

	checkSityAndTown(user) {
		if (user['city'] == this.parameters.city) return true;
		if (!user['home_town']) return false;
		let towns = `Спб, Питер, Санкт-петербург, СанктПетербург,
					 Saint, Петербург, Петроград, Ленинград, ПЕТЕРБУРГ,
					 saint-petersburg, saint petersburg`;
		let regExp = new RegExp(this.escapeRegExp(user['home_town']), 'i');
		if (regExp.test(towns)) return true;
		return false;
	}

	checkLvl(user) {
		if (user['bdate'] && user['bdate'].split('.').length == 3) {
			let year = +user['bdate'].split('.')[2];
			if (year > 1994 && year < 1998) return true;
			return false;
		}
		return false;
	}

	escapeRegExp(str) {
  		return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	}
}

const filters = new Filters();
module.exports = filters;