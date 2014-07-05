/** Плагин: сервис опечаток от компании Etersoft
 * email: info@etersoft.ru
 * автор: barbass@etersoft.ru (vlad1010@inbox.ru)
 * дата: 2012-04-18
 */

function ETYPOS(options) {
	this.init(options);
}
ETYPOS.prototype = {
	//время последнего запроса
	last_query_time: 0,

	//сайт обработки опечаток
	server_url: "http://localhost/typoservice/server/processData",

	//текст ошибок
	error: '',

	//язык по умочланияю
	default_language: 'ru',

	//данные для отправки (сайт страницы, текст с ошибкой, комментарий, язык, броузер)
	userdata: {
		'url': '',
		'text': '',
		'comment': '',
		'language': this.default_language,
	},

	//перевод строк по-умолчанию
	language: {
		'ru': {
			'error_url': 'Не определен URL сайта',
			'error_text': 'Текст не выделен',
			'error_text_length': 'Длина текста должна быть от %s до %s символов (сейчас: %s)',
			'error_comment': 'Длина комментария должна быть до 30 символов (сейчас: %s)',
			'error_time_activity': 'Вы слишком часто отправляете данные',
			'error_response': 'Ошибка при получении ответа',
			'error_parse_reposnse': 'Ошибка при обработке ответа',
			'error_post_data': 'Ошибка отправки данных. Повторите позже',
			'error_userdata': 'userdata is not Object',

			'text_post_data': 'Идет отправка данных...',
			'text_success': 'Спасибо за ваше внимание!',
		}
	},

	/**
	 * Инициализация
	 * @param array Опции
	 */
	init: function(options) {

		this.options = (options) ? options : {};

		if (this.options['server_url']) {
			this.server_url = this.options['server_url'];
		}

		if (this.options['language']) {
			if (this.language[this.options['language']]) {
				this.default_language = this.options['language'];
				this.userdata['language'] = this.default_language;
			}
		}

		this.request = new (window.XDomainRequest || window.XMLHttpRequest);
	},

	/**
	 * Получаем выделенный текст
	 */
	getSelectText: function() {
		return (window.getSelection()) ? String(window.getSelection()) : '';
	},

	/**
	 * Скрытие/показ окна
	 */
	controlPanel: function() {
		(document.querySelector(".e_typos_div").style.display == "block") ? this.closeWindow() : this.openWindow();
	},

	/*Открытие окна*/
	openWindow: function() {
		var main_div = document.querySelector(".e_typos_div");

		this.userdata['text'] = this.getSelectText();
		main_div.querySelector(".e_typos_desc .e_typos_desc_text").innerHTML = this.userdata['text'];

		//Определяем на какой позиции X, Y всплывет элемент
		var top = window.pageYOffset + window.innerHeight/3;
		var left = window.pageXOffset + window.innerWidth/3;
		main_div.style.top = top + "px";
		main_div.style.left = left + "px";
		main_div.style.display = "none";

		main_div.querySelector(".e_typos_comment").value = "";
		main_div.querySelector(".e_typos_message").innerHTML = "";

		main_div.style.display = "block";
	},

	/**
	 * Закрытия окна
	 */
	closeWindow: function() {
		document.querySelector(".e_typos_div").style.display = "none";
	},

	/*Проверка данных перед отправкой*/
	validateData: function() {
		if (typeof(this.userdata) != 'object') {
			throw new Error(this.language[this.default_language]['error_userdata']);
			return false;
		}

		if (this.userdata['url'] == '') {
			this.error = this.language[this.default_language]['error_url'];
			return false;
		}

		if (!this.userdata['language']) {
			this.userdata['language'] = this.default_language;
		}

		if (!this.userdata['text']) {
			this.error = this.language[this.default_language]['error_text'];
			return false;
		}

		if (this.userdata['text'].length < 5 || this.userdata['text'].length > 30) {
			this.error = this.sprintf(this.language[this.default_language]['error_text_length'], [5, 30, this.userdata['text'].length]);
			return false;
		}

		if (this.userdata['comment'].length > 30) {
			this.error = this.sprintf(this.language[this.default_language]['error_comment'], [this.userdata['comment'].length]);
			return false;
		}

		return true;
	},

	/*Сбор данных*/
	postData: function() {
		this.userdata['url'] = window.location.href;
		//this.userdata['text'] = this.getSelectText();
		this.userdata['comment'] = (document.querySelector(".e_typos_div .e_typos_comment")) ? document.querySelector(".e_typos_div .e_typos_comment").value : '';

		try {
			if (!this.validateData()) {
				this.printMessage('error', this.error);
				return false;
			}
		} catch(error) {
			this.printMessage('error', error.message);
			return false;
		}

		this.ajaxQuery();

	},

	/**
	 * Создание формы с данными
	 */
	formData: function() {
		if (!FormData()) {
			throw new Error("FormData() not found");
			return false;
		}
		var form_data = new FormData();
		for(var key in this.userdata) {
			form_data.append(key, this.userdata[key]);
		}
		return form_data;
	},

	/**
	 * Отправка запроса
	 */
	ajaxQuery: function() {
		var this_object = this;

		try {
			var form_data = this.formData();
		} catch (error) {
			this.printMessage("error", error.message);
			return false;
		}

		if (!this.validateRightTime()) {
			this.printMessage("error", this.language[this.default_language]['error_time_activity']);
			return false;
		} else {
			this.last_query_time = this.getTime();
			this.setStorage("etypos/"+window.location.hostname+"", this.getTime());
		}

		this.printMessage("attention", this.language[this.default_language]['text_post_data']);

		this.request.open("POST", this.server_url, true);

		this.request.onload = function() {
			try {
				var response = window.JSON.parse(this_object.request.responseText);

				if (response['success'] && response['message']) {
					if (response['success'] == 'true') {
						var success = 'success';
					} else {
						var success = 'error';
					}
					this_object.printMessage(success, response['message']);
				} else {
					this_object.printMessage('attention', this_object.language[this_object.default_language]['error_response']);
				}
			} catch (e) {
				this_object.printMessage('error', this_object.language[this_object.default_language]['error_response_parse']);
			}
		};

		this.request.onerror = function() {
			this_object.printMessage("error", this_object.language[this_object.default_language]['error_post_data']);
		};

		this.request.send(form_data);

		return;
	},

	/*Печатаем сообщение пользователю в окно*/
	printMessage: function(status, text) {
		document.querySelector(".e_typos_div .e_typos_message").innerHTML = "<span class='"+status+"'>"+text+"</span>";
	},

	//Вывод текста, выделенного пользователем
	printUserText: function(text) {
		document.querySelector(".e_typos_div .e_typos_user_text").style.display = "block";
		document.querySelector(".e_typos_div .e_typos_user_text").innerHTML = "Ваш текст: "+text;
	},

	/*Проверяем время, прошедшее с последнего отправления данных*/
	validateRightTime: function() {return true;
		var prev_time = (parseInt(this.getStorage("etypos/"+window.location.hostname))) ? parseInt(this.getStorage("etypos/"+window.location.hostname)) : parseInt(this.last_query_time);
		if (isNaN(prev_time)) {
			return true;
		}

		if ((this.getTime() - prev_time) < 60000) {
			return false;
		}

		return true;
	},

	/**
	 * Получаем текущее время
	 * @return int
	 */
	getTime: function() {
		return new Date().getTime();
	},

	/**
	 * Получаем из sessionStorage данные
	 * @param key
	 * @return bool | array | string
	 */
	getStorage: function(key) {
		if (window['sessionStorage']) {
			return (sessionStorage.getItem(key)) ? sessionStorage.getItem(key) : false;
		} else {
			return false;
		}
	},

	/**
	 * Устанавливаем в sessionStorage данные
	 * @param string Ключ
	 * @param array | int | string Данные
	 * @return bool
	 */
	setStorage: function(key, data) {
		if (window['sessionStorage']) {
			sessionStorage.setItem(key+"", data);
			return true;
		}
		return false;
	},

	/**
	 * Элементарный аналог php-ой функции sprintf
	 * @param string Строка
	 * @param string | int Значение для подстановки
	 */
	sprintf: function(string, data) {
		if (typeof(string) != 'string') {return false;}
		if (typeof(data) != 'object') {return false;}

		var str_array = string.split('%s', data.length+1);
		if ((str_array.length-1) != data.length) {return false;}

		var new_string = '';
		for(var i=0; i<(str_array.length); i++) {
			if (!data[i]) {data[i] = "";}
			new_string += str_array[i]+data[i]+"";
		}
		return new_string;
	}

};
