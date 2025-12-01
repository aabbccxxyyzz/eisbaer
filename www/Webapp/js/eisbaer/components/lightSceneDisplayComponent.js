function LightSceneDisplayComponent(comp) {
  this.componentReady = $.Deferred();

  this.ppcid = comp.id;
  this.element = $('<div class="lightscene"></div>');
  this.html = $('<a></a>');
  this.list = $('<ul></ul>');
  this.packet = null;
  this.locked = false;
  this.state = -1;
  this.selectedRow = null;
  this.lightScenes = [];
  this.changes = {};
  this.editLock = false;
  this.lastJson = null;
  this.dataReceived = false;

  //initiate viewModel
  this.viewModel = $.extend(new VisibleViewModel(comp.viewModel.EP, this).viewModel, {});
  /*
	this.viewModel = {
		width: 600,
		height: 400,
		left: 100,
		top: 50,
		z: 1,
		visible: true,
		rotationAngle: 0
	};
	*/

  var viewModel = this.viewModel;
  var self = this;

  $.each(comp.viewModel.EP, function (key, property) {
    switch (property.Name) {
      case 'Locked':
        viewModel.locked = property['boolean'] == 'true';
        break;
      default:
        break;
    }
  });

  if (this.viewModel.textFormat) {
    var fontFactor = 0.75;
    this.fontStyle = {
      color: eisbaerSupport.hex2rgba($(this.viewModel.textFormat.FontColor).text()),
      fontFamily: this.viewModel.textFormat.FontFamily,
      fontSize: this.viewModel.textFormat.FontSize * fontFactor + 'pt',
      fontStyle: this.viewModel.textFormat.FontStyleItalic,
      fontWeight: this.viewModel.textFormat.FontStyleBold <= 400 ? 'normal' : 'bold',
      textShadow: 'none',
      textDecoration: 'none',
    };
    this.list.css(this.fontStyle);
  }

  this.selectRow = function () {
    if (self.locked) {
      return;
    }
    self.list.find('li').removeClass('selected');
    $(this).addClass('selected');
    self.selectedRow = $(this).data('id');
    self.element.addClass('selected');
  };

  this.deleteScene = function () {
    var id = self.selectedRow;

    if (id === null) {
      return;
    }

    self.list.find('li').each(function () {
      if ($(this).data('id') == id) {
        $(this).remove();
      }
    });

    self.selectedRow = null;
    self.element.removeClass('selected');

    var packet = {
      __type: 'LightSceneActionCommandPacket:#Eisbaer.DataPackets',
      ID: self.packet.ID,
      Action: 0, // ActionDelete
      LightSceneID: id,
    };
    eisbaerServer.sendCommandToModel(packet);
    eisbaerServer.logAction(comp, 'ScenarioDeleted', '');
  };

  this.recallScene = function () {
    if (self.locked) {
      return;
    }

    var id = self.selectedRow;

    if (id === null) {
      return;
    }

    var packet = {
      __type: 'LightSceneActionCommandPacket:#Eisbaer.DataPackets',
      ID: self.packet.ID,
      Action: 1, // ActionRecall
      LightSceneID: id,
    };
    eisbaerServer.sendCommandToModel(packet);
    eisbaerServer.logAction(comp, 'ScenarioCalled', '');
  };

  this.saveScene = function () {
    var id = self.selectedRow;

    if (id === null) {
      return;
    }

    // create scene from current channels
    var scene = {
      ID: id,
      Channels: self.packet.Channels,
    };
    for (var i = 0; i < scene.Channels.length; ++i) {
      self.renameFields(scene.Channels[i]);
      scene.Channels[i].Value = {
        DataPointValue_x002B__Data: null,
      };
    }

    var packet = {
      __type: 'LightSceneUpdateCommandPacket:#Eisbaer.DataPackets',
      ID: self.packet.ID,
      Action: 0, // ActionSave
      LightScene: scene,
    };
    eisbaerServer.sendCommandToModel(packet);
    eisbaerServer.logAction(comp, 'ScenarioSaved', '');
  };

  this.getChannelValue = function (sceneId, channelId) {
    var scene = null,
      i;

    for (i = 0; i < this.lightScenes.length; ++i) {
      if (this.lightScenes[i].ID == sceneId) {
        scene = this.lightScenes[i];
        break;
      }
    }

    if (!scene) {
      return null;
    }

    for (i = 0; i < scene.Channels.length; ++i) {
      if (scene.Channels[i].ID == channelId) {
        return scene.Channels[i].Value;
      }
    }

    return null;
  };

  /**
   * Send scene changes to the server
   */
  this.addScene = function (name, selected, id) {
    var channels = [];
    var action = 1; // ActionUpdate
    var i;

    if (id === null || id === 'new') {
      id = 0;
      for (i = 0; i < self.lightScenes.length; ++i) {
        if (self.lightScenes[i].ID >= id) {
          id = self.lightScenes[i].ID + 1;
        }
      }
    }

    var scene = null;
    for (i = 0; id !== null && i < self.lightScenes.length; ++i) {
      if (self.lightScenes[i].ID == id) {
        scene = self.lightScenes[i];
        break;
      }
    }

    var changes = self.changes[id] || {};

    if (!scene) {
      action = 2; // ActionNewCreated
      changes = self.changes['new'] || {};
      scene = {
        ID: id,
        Channels: this.packet.Channels,
      };
      for (i = 0; i < scene.Channels.length; ++i) {
        self.renameFields(scene.Channels[i]);
        delete scene.Channels[i].IgnoreChannel;
      }
    }

    for (i = 0; i < scene.Channels.length; ++i) {
      var cur = scene.Channels[i];
      if (changes.hasOwnProperty(cur.ID)) {
        for (var j in changes[cur.ID]) {
          cur.DotNetValue[j] = changes[cur.ID][j];
        }
      }

      cur.Selected = selected.indexOf(cur.ID) != -1;
      cur.Value = {
        DataPointValue_x002B__Data: null,
      };
    }

    scene.Name = name;

    this.element.find('.toolbar .configure').addClass('disabled');
    this.editLock = true;

    var packet = {
      __type: 'LightSceneUpdateCommandPacket:#Eisbaer.DataPackets',
      ID: self.packet.ID,
      Action: action,
      LightScene: scene /*{
				Name: name,
				ID: id,
				Channels: channels
			}*/,
    };
    eisbaerServer.sendCommandToModel(packet);
    eisbaerServer.logAction(comp, 'ScenarioChanged', '');
  };

  //component callback method
  this.compCallback = function (packet) {
    this.packet = packet;

    var json = JSON.stringify(packet);
    if (!this.editLock && json == this.lastJson) {
      return;
    }
    this.lastJson = json;

    eisbaerComponent.setVisibility(this, packet.Visible);

    if (!this.dataReceived && packet.Channels) {
      this.dataReceived = true;
      this.element.addClass('data_received');
    }

    if (!packet.LightScenes) {
      return;
    }

    this.lightScenes = packet.LightScenes;

    var list = packet.LightScenes;
    var row;
    var found = false;
    this.list.empty();
    // sort list
    list.sort(function (a, b) {
      return a.ID - b.ID;
    });

    for (var i = 0; i < list.length; ++i) {
      row = $('<li><div>' + list[i].Name + '_' + list[i].ID + '</div></li>');
      if (this.selectedRow === list[i].ID) {
        row.addClass('selected');
        found = true;
      }
      row.data('id', list[i].ID);
      row.on('tap', this.selectRow);
      this.list.append(row);
    }

    if (this.selectedRow && !found) {
      this.selectedRow = null;
      this.element.removeClass('selected');
    }

    if (this.editLock) {
      this.editLock = false;
      this.element.find('.toolbar .configure').removeClass('disabled');
    }
  };

  this.renameFields = function (obj) {
    var map = {
      '<ID>k__BackingField': 'ID',
      '<Channel>k__BackingField': 'Name',
      '<DtpDotNetValue>k__BackingField': 'DotNetValue',
      '<IgnoreChannel>k__BackingField': 'IgnoreChannel',
      '<Value>k__BackingField': 'Value',
    };

    for (var i in map) {
      if (obj.hasOwnProperty(i)) {
        obj[map[i]] = obj[i];
        delete obj[i];
      }
    }

    obj.Selected = true;
  };

  /**
   * Create new scene or edit existing scene
   */
  this.newSceneDialog = function (scene) {
    var row, cur, i, channels;
    var dialog = $('<div class="lightscene-dialog new"></div>');
    dialog.append('<div class="overlay" />');
    var inner = $('<div class="inner" />');
    var topBar = $('<div class="topbar"></div>');
    topBar.append('<label>场景名称:</label>');
    topBar.append('<input type="text" value="' + (scene ? scene.Name : '场景') + '" />');
    inner.append(topBar);

    var wrapper = $('<div class="wrapper"></div>');
    var table = $('<table></table>');
    var tableHead = $('<thead></thead>');
    tableHead.append('<td>名称</td>');
    tableHead.append('<td>选择</td>');
    tableHead.append('<td>值</td>');
    table.append(tableHead);

    var tableBody = $('<tbody></tbody>');

    self.changes = {}; // reset changes

    if (!scene) {
      scene = {
        ID: 'new',
        Channels: this.packet.Channels,
      };
      for (i = 0; i < scene.Channels.length; ++i) {
        self.renameFields(scene.Channels[i]);
      }
    }

    if (scene) {
      // edit existing scene
      for (i = 0; i < scene.Channels.length; ++i) {
        cur = scene.Channels[i];
        row = $('<tr></tr>');
        row.append('<td>' + cur.Name + '</td>');
        row.append(
          '<td class="check"><input type="checkbox" ' + (cur.Selected ? 'checked="checked"' : '') + ' value="' + cur.ID + '" /></td>',
        );
        if (cur.Value) {
          var value = LightSceneDisplayComponent.transformValue(cur.Value.__type, cur.Value.DataPointValue_x002B__Data);
          var typeArr = cur.Value.__type ? cur.Value.__type.split(':#') : [];
          var td = $('<td>' + value.value + '</td>');
          td.data('type', typeArr[0]);
          //td.data('value', value.value);
          td.data('value', value);
          td.data('channelID', cur.ID);
          td.on('tap', function () {
            var td = $(this);
            var chanId = $(this).data('channelID');
            var dlg = $('.lightscene-dialog.value[data-channel-id="' + chanId + '"]');

            $('.lightscene-dialog.value').hide(); // hide existing

            if (dlg.length) {
              dlg.show();
              return false;
            }

            var formGen = LightSceneDisplayComponent.getForm[$(this).data('type')];

            if (!formGen) {
              alert('Kein Formular für Typ ' + $(this).data('type'));
              return false;
            }

            var tmp = (self.changes[scene.ID] = self.changes[scene.ID] || {});

            tmp[chanId] = tmp[chanId] || {};

            var form = formGen($(this).data('value'), tmp[chanId]);
            form.on('submit', function (e) {
              e.preventDefault();
              return false;
            });
            var inner = $('<div class="inner" />');
            inner.append(form.children());
            form.append('<div class="overlay" />');
            form.append(inner);
            form.attr('data-channel-id', chanId);

            // append bottom bar
            var bottomBar = $('<div class="bottom"><div class="bottombar"></div></div>');
            var okButton = $('<button>OK</button>');
            okButton.on('tap', function () {
              var value = form.data('returnFunc')();
              td.text(value);
              //td.data('value', value);
              //form.remove();
              form.hide();
              return false;
            });
            bottomBar.find('.bottombar').append(okButton);
            var cancelButton = $('<button>取消</button>');
            cancelButton.on('tap', function () {
              //form.remove();
              form.hide();
              return false;
            });
            bottomBar.find('.bottombar').append(cancelButton);
            inner.append(bottomBar);

            $('#page-mode-noscale').append(form);

            // calculate position
            var w = form.width();
            var h = form.height();
            var top = $(window).height() / 2 - h / 2;
            var left = $(window).width() / 2 - w / 2;
            form.css({
              top: top > 0 ? top : 0,
              left: left > 0 ? left : 0,
            });

            return false;
          });
          row.append(td);
        } else {
          td = $('<td></td>');
          td.on('tap', function () {
            alert('无值');
            return false;
          });
          row.append(td);
        }

        row.on('tap', function (e) {
          $(this).addClass('selected').siblings().removeClass('selected');
          return $(e.target).is('input,td.check'); // return true if we hit a checkbox
        });
        tableBody.append(row);
      }
    } else {
      alert('没有场景');
      for (i = 0; self.packet && i < self.packet.Channels.length; ++i) {
        cur = self.packet.Channels[i];
        row = $('<tr></tr>');
        row.append('<td>' + cur.value + '</td>');
        row.append('<td class="check"><input type="checkbox" checked="checked" value="' + cur.key + '" /></td>');
        row.append('<td></td>');
        row.on('tap', function () {
          $(this).addClass('selected').siblings().removeClass('selected');
        });
        tableBody.append(row);
      }
    }

    table.append(tableBody);

    wrapper.append(table);
    inner.append(wrapper);

    var bottomBar = $('<div class="bottombar"></div>');
    var okButton = $('<button>OK</button>');
    okButton.on('tap', function () {
      /* save changes of scene editor */
      var name = topBar.find('input').val();
      var selected = [];
      tableBody.find('input:checked').each(function () {
        selected.push(parseInt($(this).attr('value')));
      });
      var id = scene ? scene.ID : null;
      self.addScene(name, selected, id);
      dialog.remove();
      $('.lightscene-dialog.value').remove(); // remove all value dialogs
      return false;
    });
    bottomBar.append(okButton);
    var cancelButton = $('<button>取消</button>');
    cancelButton.on('tap', function () {
      dialog.remove();
      $('.lightscene-dialog.value').remove(); // remove all value dialogs
      return false;
    });
    bottomBar.append(cancelButton);
    inner.append(bottomBar);
    dialog.append(inner);

    $('#page-mode-noscale').append(dialog);

    var pixelRatio = window.devicePixelRatio || 1;
    var w = dialog.width();
    var h = dialog.height();
    /*
		if (pixelRatio > 1){
			var scale = 1/pixelRatio;
			w *= scale;
			h *= scale;
			dialog.css({
				transform: "scale("+scale+")",
				transformOrigin: "0 0"
			})
		}
		*/
    // calculate position
    var top = $(window).height() / 2 - h / 2;
    var left = $(window).width() / 2 - w / 2;
    dialog.css({
      top: top > 0 ? top : 0,
      left: left > 0 ? left : 0,
    });
  };

  //render method
  this.render = function (container) {
    var self = this;
    var element = this.element;

    var toolbar = $('<div class="toolbar"></div>');

    var newButton = $('<div class="new"></div>');
    newButton.on('tap', function () {
      self.newSceneDialog();
      return false;
    });
    toolbar.append(newButton);
    var saveButton = $('<div class="save"></div>');
    saveButton.on('tap', this.saveScene);
    toolbar.append(saveButton);
    var deleteButton = $('<div class="delete"></div>');
    deleteButton.on('tap', this.deleteScene);
    toolbar.append(deleteButton);
    var configureButton = $('<div class="configure"></div>');
    configureButton.on('tap', function () {
      if (self.selectedRow === null) {
        return false;
      }

      if (self.editLock) {
        return false;
      }

      if ($('.lightscene-dialog.new').length) {
        return false;
      }

      $('.lightscene-dialog.value').remove(); // remove leftovers

      for (var i = 0; i < self.lightScenes.length; ++i) {
        if (self.lightScenes[i].ID == self.selectedRow) {
          self.newSceneDialog(self.lightScenes[i]);
          break;
        }
      }

      return false;
    });
    toolbar.append(configureButton);

    var recallButton = $('<div class="recall"></div>');
    recallButton.on('tap', this.recallScene);
    toolbar.append(recallButton);

    toolbar.children().on('tap', function () {
      var o = $(this);

      if (!o.hasClass('new') && (self.selectedRow === null || self.editLock)) {
        return false;
      }

      o.addClass('highlite');
      setTimeout(function () {
        o.removeClass('highlite');
      }, 1000);

      return false;
    });

    element.append(toolbar);

    this.list.css('height', this.viewModel.height - 40 - 2 - 2);

    element.append(this.list);

    //embed element
    container.append(element);

    //this.locked = this.viewModel.locked;
  };

  //sendPacket method
  this.sendPacket = function (scenes) {
    var packet = {
      __type: 'LightSceneDisplayTCDP:#Eisbaer.DataPackets',
      ID: this.packet.ID,
      LightScenes: scenes,
    };
    eisbaerServer.sendCommandToModel(packet);
  };

  this.checkComponentReady = function () {
    //register component callback for observer
    eisbaerServer.callbacks[this.ppcid] = this.compCallback.bind(this);
    this.componentReady.resolve();
  };

  this.checkComponentReady();
}
