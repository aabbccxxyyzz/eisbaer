AlarmClockEditorComponent.prototype.strings = {
	de: {
		"editorTitle": "Wecker Kanalliste",
		"Select":"",
		"Name":"Name",
		"TimeOffset":"Schaltoffset (min)",
		"ActiveTime":"Aktivzeit (min)",
		"ValueOn":"Wert aktiv",
		"ValueOff":"Wert inaktiv",
		"Summer":"Sommer",
		"Winter":"Winter",
		"snooze":"Schlummern",
		"dismiss":"Alarm aus",
		"DtpActiveValue":"Wert aktiv",
		"DtpNotActiveValue":"Wert inaktiv",
		"ok":"OK",
		"save":"Speichern",
		"cancel":"Abbrechen"
	},
	en: {
		"editorTitle": "AlarmClock Output List Editor",
		"Select":"",
		"Name":"Name",
		"TimeOffset":"Switching offset (min)",
		"ActiveTime":"Active time (min)",
		"ValueOn":"Value active",
		"ValueOff":"Value inactive",
		"Summer":"Summer",
		"Winter":"Winter",
		"snooze":"Snooze",
		"dismiss":"Dismiss",
		"DtpActiveValue":"Value active",
		"DtpNotActiveValue":"Value inactive",
		"ok":"OK",
		"save":"Save",
		"cancel":"Cancel"
	}	,
	zh: {
	"editorTitle": "闹钟输出列表编辑器",
	"Select": "",
	"Name": "名称",
	"TimeOffset": "切换偏移（分钟）",
	"ActiveTime": "激活时间（分钟）",
	"ValueOn": "激活值",
	"ValueOff": "未激活值",
	"Summer": "夏令时",
	"Winter": "冬令时",
	"snooze": "贪睡",
	"dismiss": "关闭",
	"DtpActiveValue": "激活值",
	"DtpNotActiveValue": "未激活值",
	"ok": "确定",
	"save": "保存",
	"cancel": "取消"
	}
};

AlarmClockEditorComponent.prototype.t = eisbaerLocale.translateComponent;

/*
AlarmClockEditorComponent.prototype.t = function (text){
	// select language by current project language
	var target = 'en';
	var lang = window.localStorage.getItem('language');
	if (lang && lang.toLowerCase().substr(0, 2) == 'de'){
		target = 'de';
	}
	
	if (this.strings[target].hasOwnProperty(text)){
		return this.strings[target][text];
	} else {
		return text;
	}
};
*/
