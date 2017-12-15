class HandlerError {
	constructor() {

	}

	on (error) {
		switch(error.error_code) {
			case 18:
				return console.log(error.error_msg);
				break;
			default:
				console.log(error.error_code);
				return console.log(error.error_msg);
		}
	}
}

const handlerError = new HandlerError();
module.exports = handlerError;