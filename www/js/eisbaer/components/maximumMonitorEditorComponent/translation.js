MaximumMonitorEditorComponent.prototype.strings = {
	de: {
		"title": "Maximum Wächter Anzeige",
		"power": "Leistung",
		"current": "Aktuell",
		"trend": "Trend",
		"period_cumulated": "Periode kumuliert",
		"period_available": "Periode verfügbar",
		"channel": "Kanal",
		"mode": "Mode",
		"counterimpuls": "Arbeitsimpuls",
		"sync": "Sync",
		"pre-warning": "Vorwarnung",
		"alarm": "Alarm",
		"emergency": "Notbetrieb",
		"alarm_extern": "Externes Ereignis Übergang in den Notbetrieb",
		"alarm_sollwert": "Sollwertüberschreitung Spitzenlastüberschreitung"
	},
	en: {
		"title": "Maximum Monitor Display",
		"power": "Power",
		"current": "Current",
		"trend": "Trend",
		"period_cumulated": "Period cumulated",
		"period_available": "Period available",
		"channel": "Channel",
		"mode": "Mode",
		"counterimpuls": "Counterimpuls",
		"sync": "Sync",
		"pre-warning": "Pre-warning",
		"alarm": "Alarm",
		"emergency": "Emergency",
		"alarm_extern": "Externes Ereignis Übergang in den Notbetrieb",
		"alarm_sollwert": "Sollwertüberschreitung Spitzenlastüberschreitung"
	},
	zh: {
"title": "最大值监控显示",
"power": "功率",
"current": "电流",
"trend": "趋势",
"period_cumulated": "周期累计值",
"period_available": "周期可用值",
"channel": "通道",
"mode": "模式",
"counterimpuls": "工作脉冲",
"sync": "同步",
"pre-warning": "预警",
"alarm": "报警",
"emergency": "应急运行",
"alarm_extern": "外部事件触发应急运行",
"alarm_sollwert": "设定值超限 峰值负载超限"
}
};

MaximumMonitorEditorComponent.prototype.t = eisbaerLocale.translateComponent;
/*
MaximumMonitorEditorComponent.prototype.t = function (text){
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
