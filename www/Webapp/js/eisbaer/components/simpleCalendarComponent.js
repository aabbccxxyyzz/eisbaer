function SimpleCalendarComponent(comp) {
  this.componentReady = $.Deferred();

  this.ppcid = comp.id;
  this.element = $('<div class="simple-calendar"></div>');
  this.html = null;
  this.packet = null;
  this.channels = [];
  this.channel2user = {};
  this.appointment = null;

  //initiate viewModel
  this.viewModel = new VisibleViewModel(comp.viewModel.EP, this).viewModel;

  //initialize viewModel
  var viewModel = this.viewModel;
  var self = this;

  /*
    $.each(comp.viewModel.EP, function(key, property){
        switch (property.Name) {
            default:
                break;
        }
    });
	*/

  var fontFactor = 0.75;
  this.fontStyle = {
    //color: eisbaerSupport.hex2rgba($(this.viewModel.textFormat.FontColor).text()),
    //color: 'black',
    fontFamily: this.viewModel.textFormat.FontFamily,
    fontSize: this.viewModel.textFormat.FontSize * fontFactor + 'pt',
    fontStyle: this.viewModel.textFormat.FontStyleItalic,
    fontWeight: this.viewModel.textFormat.FontStyleBold <= 400 ? 'normal' : 'bold',
    textShadow: 'none',
    textDecoration: this.viewModel.textFormat.FontStyleUnderline != '' ? 'underline' : 'none',
  };

  //component callback method
  this.compCallback = function (packet) {
    this.packet = packet;

    if ('Data' in packet) {
      if (Array.isArray(packet.Data.CalendarOutputs)) {
        this.channels = packet.Data.CalendarOutputs;
        this.channels.sort(function (a, b) {
          return a.Name.localeCompare(b.Name);
        });
        var i, users;

        this.channel2user = {};
        for (i = 0; i < this.channels.length; ++i) {
          var chan = this.channels[i];
          users = [];
          if (typeof chan.SelectedUsers === 'string') {
            var o = $(chan.SelectedUsers.replace(/Selected=/g, 'IsSelected='));
            o.find('SelectedUser').each(function () {
              var selected = $(this).attr('IsSelected');
              var name = $(this).attr('UserName');
              if (selected === 'True') {
                users.push(name);
              }
            });
          }
          this.channel2user[chan.Id] = users;
        }
      }

      if (Array.isArray(packet.Data.Appointments)) {
        if (packet.Data.Appointments.length) {
          this.appointment = packet.Data.Appointments[0];
        } else {
          this.appointment = null;
        }
        this.update();
      }
    }

    eisbaerComponent.setVisibility(this, packet.Visible);
  };

  this.showDialog = function () {
    var users;
    // if we can't see the currently selected channel, return
    if (this.appointment) {
      var curId = this.appointment.OutputId;
      users = this.channel2user[curId];
      if (Array.isArray(users) && users.length) {
        if (users.indexOf(eisbaerUser.user) === -1) {
          // can't see this channel
          return;
        }
      }
    }

    var dialog = $('<div class="simple-calendar-dialog" />');
    var container = $('<div class="simple-calendar" />');

    var table = $('<table />');
    table.append('<tr><td colspan="14"></td></tr>');
    var input = $('<input class="subject" type="text" placeholder="' + this.t('subject_nulltext') + '" />');
    table.find('td').last().append(input);
    table.append(
      '<tr class="time">' +
        '<td colspan="7"><input type="text" class="time start" placeholder="' +
        this.t('datefrom_nulltext') +
        '" /></td>' +
        '<td colspan="7"><input type="text" class="time end" placeholder="' +
        this.t('dateto_nulltext') +
        '" /></td>' +
        '</tr>',
    );

    table.find('input.time').on('touchstart touchend focus click mousedown mouseup', function (e) {
      if ($(this).closest('td').hasClass('inactive')) {
        e.stopImmediatePropagation();
        return false;
      }
    });

    table.find('input.time').on('touchstart', function () {
      var v = $(this).val();
      if (!v.length) {
        $(this).val('00:00:00');
      }
    });

    table.find('input.time').scroller({
      theme: 'android',
      mode: 'scroller',
      display: 'modal',
      lang: 'de',
      preset: 'time',
      timeWheels: 'HHiiss',
      timeFormat: 'HH:ii:ss',
    });
    var weekdays = $('<tr class="weekdays">');
    var days = [
      this.t('text_sun'),
      this.t('text_mon'),
      this.t('text_tue'),
      this.t('text_wed'),
      this.t('text_thu'),
      this.t('text_fri'),
      this.t('text_sat'),
    ];
    for (var i = 0; i < days.length; ++i) {
      var td = $('<td colspan="2">' + days[i] + '</td>');
      td.on('tap', function () {
        $(this).toggleClass('inactive');
      });
      weekdays.append(td);
    }
    table.append(weekdays);
    table.append(
      '<tr class="send-value">' +
        '<td class="start" colspan="7">' +
        this.t('sendstartvalue_text') +
        '</td>' +
        '<td class="end" colspan="7">' +
        this.t('sendendvalue_text') +
        '</td>' +
        '</tr>',
    );
    table.find('.send-value td').on('tap', function () {
      $(this).toggleClass('inactive');

      var checked = !$(this).hasClass('inactive');
      var isStart = $(this).hasClass('start');
      var input = table.find('input.time.' + (isStart ? 'start' : 'end'));
      //input.prop("disabled", !checked);
      if (!checked) {
        // input.val(isStart?"00:00:00":"23:59:59");
        input.closest('td').addClass('inactive');
      } else {
        input.closest('td').removeClass('inactive');
      }
    });
    table.append('<tr><td colspan="14"></td></tr>');
    var selector = $('<select />');
    var opt = $('<option value="00000000-0000-0000-0000-000000000000">(' + this.t('none') + ')</option>');
    if (!this.appointment || (this.appointment && this.appointment.OutputId === '00000000-0000-0000-0000-000000000000')) {
      opt.prop('selected', true);
    }
    selector.append(opt);

    for (i = 0; i < this.channels.length; ++i) {
      var cur = this.channels[i];

      users = this.channel2user[cur.Id];
      if (Array.isArray(users) && users.length) {
        if (users.indexOf(eisbaerUser.user) === -1) {
          // can't see this channel
          continue;
        }
      }

      opt = $('<option>' + cur.Name + '</option>');
      var col = [cur.Color.R, cur.Color.G, cur.Color.B, cur.Color.A / 255.0];
      opt.css('background', 'rgba(' + col.join(',') + ')');
      opt.attr('value', cur.Id);
      if (this.appointment && this.appointment.OutputId === cur.Id) {
        opt.prop('selected', true);
        selector.css('background', 'rgba(' + col.join(',') + ')');
      }
      selector.append(opt);
    }

    selector.on('change', function () {
      var id = $(this).val();
      var colStr = '';
      for (i = 0; i < self.channels.length; ++i) {
        var cur = self.channels[i];
        if (cur.Id === id) {
          var col = [cur.Color.R, cur.Color.G, cur.Color.B, cur.Color.A / 255.0];
          colStr = 'rgba(' + col.join(',') + ')';
        }
      }
      selector.css('background', colStr);
    });

    table.find('td').last().append(selector);
    table.append('<tr><td class="buttons" colspan="14"></td></tr>');

    var buOK = $('<button>' + this.t('btnok_nulltext') + '</button>');
    buOK.on('tap', function () {
      // build packet
      table.find('input.time').trigger('blur');
      var guid = CalendarEditorComponent.createUuid();
      var sendEnd = !table.find('.send-value .end').hasClass('inactive');
      var sendStart = !table.find('.send-value .start').hasClass('inactive');

      if (!sendStart && !sendEnd) {
        navigator.notification.alert(
          self.t('msgboxtext_nosendvalue'), // message
          null, // callback
          self.t('msgboxtitle_noweekday'), // title
          'OK', // buttonName
        );
        return false;
      }

      var dateStartVal = table.find('input.time.start').val() || '00:00:00';
      var dateEndVal = table.find('input.time.end').val() || '00:00:00';
      var dateStart = Date.parse(dateStartVal, 'HH:mm:ss');
      var dateEnd = Date.parse(dateEndVal, 'HH:mm:ss');

      if (dateStart > dateEnd) {
        dateEnd.addDays(1);
        /*
                table.find('input.time.start').val(dateEndVal);
                navigator.notification.alert(
                    self.t('msgboxtext_wrongenddate'),	// message
                    null,							    // callback
                    self.t('msgboxtitle_noweekday'),	// title
                    "OK"						        // buttonName
                );
                return false;
                */
      }

      var start = CalendarEditorComponent.offsetTimeString(dateStart);
      var end = CalendarEditorComponent.offsetTimeString(dateEnd);
      var startStr = dateStart.toString('MM/dd/yyyy HH:mm:ss');

      var weekDays = 0;
      table.find('.weekdays td').each(function () {
        if (!$(this).hasClass('inactive')) {
          weekDays += 1 << $(this).index();
        }
      });

      if (!weekDays) {
        navigator.notification.alert(
          self.t('msgboxtext_noweekday'), // message
          null, // callback
          self.t('msgboxtitle_noweekday'), // title
          'OK', // buttonName
        );
        return false;
      }

      var appointment = {
        Description: '',
        EndTime: '/Date(' + end + ')/',
        EventType: 1,
        Label: 0,
        LocationField: '',
        OutputId: selector.val(),
        RecurrenceInfoXml: '<RecurrenceInfo Start="' + startStr + '" WeekDays="' + weekDays + '" Id="' + guid + '" Type="1" Version="1" />',
        SendEndValue: !table.find('.send-value .end').hasClass('inactive'),
        SendStartValue: !table.find('.send-value .start').hasClass('inactive'),
        StartTime: '/Date(' + start + ')/',
        Subject: table.find('.subject').val(),
        SyncOutlook: 'SimpleCalendarAppointment',
        UniqueName: guid,
        iCalImport: '',
      };

      self.packet.Data.Appointments = [appointment];
      eisbaerServer.sendDataToModel(self.packet);
      eisbaerServer.logAction(comp, 'CalendarChanged', '');

      dialog.remove();
      return false;
    });
    var buDelete = $('<button>' + this.t('btndelete_nulltext') + '</button>');
    buDelete.on('tap', function () {
      if (!self.appointment) {
        return false;
      }

      function onConfirm(buttonIndex) {
        if (buttonIndex == 1) {
          // delete
          self.packet.Data.Appointments = [];
          eisbaerServer.sendDataToModel(self.packet);
          eisbaerServer.logAction(comp, 'CalendarChanged', '');
          dialog.remove();
        }
      }

      // recurring event
      navigator.notification.confirm(
        self.t('msgboxtext_delete'), // message
        onConfirm, // callback to invoke with index of button pressed
        self.t('msgboxtitle_delete'), // title
        [t('yes'), t('no')], // buttonLabels
      );

      return false;
    });
    var buCancel = $('<button>' + this.t('btncancel_nulltext') + '</button>');
    buCancel.on('tap', function () {
      dialog.remove();
      return false;
    });

    table.find('td.buttons').append(buOK, buDelete, buCancel);

    table.find('select,input,td,button').css(this.fontStyle);
    container.append(table);
    dialog.append(container);

    dialog.on('tap', function (e) {
      if (e.target === dialog[0]) {
        dialog.remove();
        return false;
      }
    });

    if (this.appointment) {
      table.find('input.subject').val(this.appointment.Subject);
      var startString = this.parseDate(this.appointment.StartTime, 'HH:mm:ss');
      var endString = this.parseDate(this.appointment.EndTime, 'HH:mm:ss');
      table.find('input.time.start').val(startString);
      table.find('input.time.end').val(endString);
      this.setWeekDays(table);

      var sendStart = this.appointment.SendStartValue;
      var sendEnd = this.appointment.SendEndValue;
      if (!sendStart) {
        table.find('.send-value .start').addClass('inactive');
        table.find('input.time.start').closest('td').addClass('inactive');
      }
      if (!sendEnd) {
        table.find('.send-value .end').addClass('inactive');
        table.find('input.time.end').closest('td').addClass('inactive');
      }
    }

    $('#page-mode-noscale').append(dialog);
  };

  this.parseDate = function (rawString, fmt) {
    if (typeof rawString !== 'string') {
      return '';
    }
    var ts = Number(rawString.match(/-?\d+/));
    var date = new Date(ts);
    return date.toString(fmt);
  };

  this.setWeekDays = function (element) {
    if (!this.appointment) {
      return;
    }
    var re = CalendarEditorComponent.recurrenceToJson(this.appointment.RecurrenceInfoXml);
    if (re) {
      if (!re.WeekDays) {
        re.WeekDays = (1 << 7) - 1; // all days are selected
      }
      element.find('.weekdays td').each(function () {
        if ((1 << $(this).index()) & re.WeekDays) {
          $(this).removeClass('inactive');
        } else {
          $(this).addClass('inactive');
        }
      });
    }
  };

  this.update = function () {
    if (!this.appointment) {
      this.element.find('td.subject').text(this.t('nosubject_nulltext')).addClass('empty');
      this.element.find('td.time').text(this.t('time_nulltext')).addClass('empty').removeClass('inactive');
      this.element.find('.weekdays td').removeClass('inactive');
    } else {
      if (this.appointment.Subject.length) {
        this.element.find('td.subject').text(this.appointment.Subject).removeClass('empty');
      } else {
        this.element.find('td.subject').text(this.t('nosubject_nulltext')).addClass('empty');
      }
      // parse dates
      var startString = this.parseDate(this.appointment.StartTime, 'HH:mm:ss');
      var endString = this.parseDate(this.appointment.EndTime, 'HH:mm:ss');
      this.element.find('td.time.start').text(startString).removeClass('empty');
      this.element.find('td.time.end').text(endString).removeClass('empty');

      // parse weekdays
      this.setWeekDays(this.element);

      if (!this.appointment.SendStartValue) {
        this.element.find('td.time.start').addClass('inactive');
      } else {
        this.element.find('td.time.start').removeClass('inactive');
      }
      if (!this.appointment.SendEndValue) {
        this.element.find('td.time.end').addClass('inactive');
      } else {
        this.element.find('td.time.end').removeClass('inactive');
      }
    }
  };

  //render method
  this.render = function (container) {
    //build element
    var element = this.element;

    //eisbaerSupport.setBackground(element, this.viewModel.backgroundUndefined);

    var table = $('<table />');
    table.append('<tr><td class="subject" colspan="14">' + this.t('nosubject_nulltext') + '</td></tr>');
    table.append(
      '<tr>' +
        '<td class="time start" colspan="7">' +
        this.t('time_nulltext') +
        '</td>' +
        '<td class="time end" colspan="7">' +
        this.t('time_nulltext') +
        '</td>' +
        '</tr>',
    );
    var weekdays = $('<tr class="weekdays">');
    var days = [
      this.t('text_sun'),
      this.t('text_mon'),
      this.t('text_tue'),
      this.t('text_wed'),
      this.t('text_thu'),
      this.t('text_fri'),
      this.t('text_sat'),
    ];
    for (var i = 0; i < days.length; ++i) {
      weekdays.append('<td colspan="2">' + days[i] + '</td>');
    }
    table.append(weekdays);
    table.find('td').css(this.fontStyle);
    element.append(table);

    element.on('taphold', function () {
      self.showDialog();
      return false;
    });

    //embed element
    element.css('overflow', 'hidden');
    container.append(element);
  };

  this.checkComponentReady = function () {
    //register component callback for observer
    eisbaerServer.callbacks[this.ppcid] = this.compCallback.bind(this);
    this.componentReady.resolve();
  };

  this.checkComponentReady();
}

SimpleCalendarComponent.prototype.strings = {
  de: {
    msgboxtitle_delete: 'Termin löschen',
    msgboxtext_delete: 'Soll dieser Termin gelöscht werden.',
    msgboxtitle_noweekday: 'Termin ungültig ...',
    msgboxtext_noweekday: 'Bitte mindestens einen Wochentag auswählen.',
    msgboxtext_nosendvalue: 'Start/End Wert senden: Bitte mindestens einen auswählen.',
    msgboxtext_wrongenddate: 'Termin Ende liegt vor Termin Start.',
    text_sun: 'So',
    text_mon: 'Mo',
    text_tue: 'Di',
    text_wed: 'Mi',
    text_thu: 'Do',
    text_fri: 'Fr',
    text_sat: 'Sa',
    appfrm_title: 'Termin anlegen ...',
    subject_nulltext: 'Betreff eingeben ...',
    datefrom_nulltext: 'Zeit von ...',
    dateto_nulltext: 'Zeit bis ...',
    sendstartvalue_text: 'Start Wert senden  ...',
    sendendvalue_text: 'Ende Wert sende ...',
    cmbchannels_nulltext: 'Kanal auswählen',
    btnok_nulltext: 'Ok',
    btndelete_nulltext: 'Löschen',
    btncancel_nulltext: 'Abbrechen',
    nosubject_nulltext: 'Kein Betreff ...',
    time_nulltext: 'Zeit ...',
    none: 'Kein Ausgang',
  },
  en: {
    msgboxtitle_delete: 'Delete Appointment',
    msgboxtext_delete: 'Confirm before delete this appointment.',
    msgboxtitle_noweekday: 'Appointment Invalid ...',
    msgboxtext_noweekday: 'Choose at least one weekday, please',
    msgboxtext_nosendvalue: 'Send start/end value: Check at least one, please',
    msgboxtext_wrongenddate: 'End time must be greater than start Time',
    text_sun: 'Sun',
    text_mon: 'Mon',
    text_tue: 'Tue',
    text_wed: 'Wed',
    text_thu: 'Thu',
    text_fri: 'Fri',
    text_sat: 'Sat',
    appfrm_title: 'Appointment Settings',
    subject_nulltext: 'Insert subject ...',
    datefrom_nulltext: 'Insert date from ...',
    dateto_nulltext: 'Insert date to ...',
    sendstartvalue_text: 'Send start value  ...',
    sendendvalue_text: 'Send end value ...',
    cmbchannels_nulltext: 'Choose an channel',
    btnok_nulltext: 'Ok',
    btndelete_nulltext: 'Delete',
    btncancel_nulltext: 'Cancel',
    nosubject_nulltext: 'No Subject ...',
    time_nulltext: 'Time ...',
    none: 'No output',
  },
  zh: {
msgboxtitle_delete: '删除事件',
msgboxtext_delete: '删除前请确认此事件。',
msgboxtitle_noweekday: '无效事件...',
msgboxtext_noweekday: '请至少选择一个工作日',
msgboxtext_nosendvalue: '发送开始/结束值：请至少勾选一个',
msgboxtext_wrongenddate: '结束时间必须大于开始时间',
text_sun: '周日',
text_mon: '周一',
text_tue: '周二',
text_wed: '周三',
text_thu: '周四',
text_fri: '周五',
text_sat: '周六',
appfrm_title: '事件设置',
subject_nulltext: '输入主题...',
datefrom_nulltext: '输入开始日期...',
dateto_nulltext: '输入结束日期...',
sendstartvalue_text: '发送开始值...',
sendendvalue_text: '发送结束值...',
cmbchannels_nulltext: '选择一个频道',
btnok_nulltext: '确定',
btndelete_nulltext: '删除',
btncancel_nulltext: '取消',
nosubject_nulltext: '无主题...',
time_nulltext: '时间...',
none: '无输出',
}
};

SimpleCalendarComponent.prototype.t = eisbaerLocale.translateComponent;
