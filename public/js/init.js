let users_array = [];
let users_count = 15;

request.get('/users', (error, respond)=> {
	if (error) return;
	users_array = respond;
	insertUsers(users_array);

	js.listen(js.get('.user_button'), 'click', function(event) {
		will_show_users_count += users_count;
		insertUsers(users_array);
	});

});


let showed_element = 0;
let will_show_users_count = users_count;

function insertUsers(users_array) {
	let html;

	if (respond && will_show_users_count > users_array.length) will_show_users_count = users_array.length;

	for (let i = showed_element; i < will_show_users_count; i++) {
		showed_element++;
		html += '<div class="item">';
		html += `<div class="wrapper_name"> <span class="item_number">${i + 1}</span>`;
		html += generateName(users_array[i]);
		html += generateRemoveUser(users_array[i]);
		html += `</div>`;
		html += generateImage(users_array[i]);
		html += `</div>`;
	}

	js.get('.main').innerHTML = html;

	
}

function generateImage(users_array) {
	let images = '';
	if (!users_array.photos) return images;
	images += '<div class="wrapper_image">'
	for (let i = 0; i < users_array.photos.length; i++) {
		// Раньше я подгружал только картинку без даты (картинка была строка)
		// Теперь присылается объект с датой и ссылкой на картинку
		// Этот код нужен для поддержки двух вариантов
		if (typeof(users_array.photos[i]) == 'object') {
			images += `
				<div class="item_image_wrapper">
					<img class="item_image" src="${users_array.photos[i].src}"/>
					<span class="item_image_date">${users_array.photos[i].date}</span>
				</div>
			`;
		}
		else {
			images += `<img class="item_image" src="${users_array.photos[i]}"/>`;
		}
	}
	images += '</div>';
	return images;
}

function generateName(respond) {
	return `<a class="item_name" href="https://vk.com/id${respond.uid}" target="_blank">
		${respond.first_name} ${respond.last_name}
		</a>`;
}

function generateRemoveUser(respond) {
	return `<div class="item_remove_user" data-uid="${respond.uid}"> | Remove</div>`;
}


js.listen(window, 'click', function(event) {
	let element = event.target.closest('.item_remove_user');
	if (element) {
		request.post('/user_hidden', {uid : js.attr(element, 'data-uid')}, (error, respond)=> {
			if (error) return alert('Ошибка удаления пользователя' + error);
			event.target.closest('.item').remove();
		});
	}
});
