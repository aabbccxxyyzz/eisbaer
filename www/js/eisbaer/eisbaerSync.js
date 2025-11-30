$.support.cors = true;

var syncReady = $.Deferred();

var eisbaerLanguages = [];
var xhr = new XMLHttpRequest();

var eisbaerSync = {
  server: null,
  port: null,
  path: "/Eisbaer.RESTServices/",
  user: "Gast",
  pass: "",
  serverIndex: 0,
  //tryPortal: false,
  authFailed: false,
  requestInterval: 500,

  downloadComplete: false,
  syncMediaLibraryComplete: false,

  reConnectInterval: null,
  reConnectTimeout: 20000,
  reConnectTimer: 0,

  dialogFailed: function () {
    $.mobile.loading("hide");
    var msg = this.authFailed
      ? t("auth_failed")
      : t("connect_failed", this.serverName);
    navigator.notification.confirm(
      msg,
      function (index) {
        switch (index) {
          case 1:
            // retry current server
            eisbaerSync.sync(eisbaerServer.index);
            //eisbaerSync.preSync();
            break;
          case 2:
            window.location = "settings.html";
            break;
          case 3:
            //TODO: hide option when only 1 server configured
            // select another server -> just hide dialog
            break;
          default:
            break;
        }
      },
      t("connect_error"),
      [t("bu_retry"), t("bu_settings"), t("bu_server")]
    );
  },

  getStatusInfo: function () {
    var url = eisbaerServer.getUrl("ReqASSI");
    var self = this;
    return new Promise((resolve, reject) => {
      $.ajax({
        url,
        type: "get",
        success: function (statusInfo) {
          if (statusInfo) {
            self.clearReConnectInterval();
            resolve(statusInfo.RequestActiveSolutionStatusInfoResult);
          } else {
            self.clearReConnectInterval();
            self.dialogFailed();
            reject(undefined);
          }
        },
        error: function () {
          self.clearReConnectInterval();
          self.dialogFailed();
          reject(undefined);
        },
      });
    });
  },

  copyToTempDirectory: function (id, image, options, callback) {
    if (cordova.platformId.toLowerCase() == "ios") {
      var self = this;
      window.resolveLocalFileSystemURL(
        eisbaerServer.imageDirectoryPath,
        function (fileEntry) {
          window.resolveLocalFileSystemURL(
            cordova.file.tempDirectory,
            function (directory) {
              fileEntry.copyTo(
                directory,
                "",
                function () {
                  if (id && image) {
                    self.addImageStyle(id, image, options, callback);
                  }
                },
                function () {}
              );
            },
            function (error) {}
          );
        },
        null
      );
    } else {
      return;
    }
  },
  reConnect: function () {
    if (this.reConnectInterval) {
      clearInterval(this.reConnectInterval);
    }
    this.reConnectInterval = setInterval(this.sync.bind(this), 2000);
    this.sync();
  },
  clearReConnectInterval: function () {
    $.mobile.loading("hide");
    clearInterval(this.reConnectInterval);
  },

  setServer: function (index, tryPortal) {
    console.log("🚀 ~ file: eisbaerSync.js:124 ~ index:", index)
    window.localStorage.setItem("eisbaer-servers-index", index);
    var json = window.localStorage.getItem("eisbaer-servers");
    var servers = JSON.parse(json);
    var cur = servers[index];
    localStorage.setItem("serverURL", cur.url);
    localStorage.setItem("selected-project", JSON.stringify(cur));
    if (eisbaerServer.expireInt) {
      clearInterval(eisbaerServer.expireInt);
      eisbaerServer.expireInt = null;
    }

    // check expired
    if (cur.valid) {
      var expireDate = Date.parseExact(cur.valid, "yyyyMMddHHmm");
      if (!expireDate) {
        expireDate = Date.parseExact(cur.valid, "yyyyMMddHH");
      }
      var diff = expireDate - new Date();
      var diffDays = diff / (1000 * 60 * 60 * 24);

      if (diff < 0) {
        navigator.notification.alert(
          cur.name + ": " + t("access_expired"), // message
          null, // callback
          t("connect_error"), // title
          t("bu_ok") // buttonName
        );
        return false;
      } else if (diffDays < 7) {
        // don't bother checking if expiration date is more than 7 days in the future
        eisbaerServer.expireInt = setInterval(function () {
          if (expireDate < new Date()) {
            clearInterval(eisbaerServer.expireInt);
            eisbaerServer.expireInt = null;
            navigator.notification.alert(
              cur.name + ": " + t("access_expired"), // message
              null, // callback
              t("connect_error"), // title
              t("bu_ok") // buttonName
            );
            eisbaerMode.goHome();
          }
        }, 60000); // check once per minute
      }
    }

    var url = cur.url.indexOf("://") != -1 ? cur.url : "http://" + cur.url;
    eisbaerServer.index = index;
    eisbaerServer.localPath = ""; // will be initialized later
    eisbaerServer.server = this.server = url;
    eisbaerServer.host = url.substring(url.indexOf("://") + 3);
    eisbaerServer.port = this.port = cur.port;
    eisbaerServer.wsPort = cur.wsPort;
    eisbaerServer.tls = cur.tls == 1;
    eisbaerServer.requestInterval = this.requestInterval =
      cur.requestInterval || 500;
    eisbaerServer.usePortal = tryPortal ? "yes" : cur.use_portal;
    eisbaerServer.portalUser = cur.portal_user;
    eisbaerServer.portalPass = cur.portal_pass;
    this.user = cur.eis_user;
    this.pass = cur.eis_pass;
    this.serverName = cur.name;

    return true;
  },

  setNextServer: function () {
    var validServer = false;
    var json = window.localStorage.getItem("eisbaer-servers");
    var servers = JSON.parse(json);

    var index = 0;
    for (var i in servers) {
      if (!servers.hasOwnProperty(i)) {
        continue;
      }
      if (index == this.serverIndex) {
        this.serverIndex++;

        var cur = servers[i];

        if (!cur.url || !cur.url.length) {
          ++index;
          continue;
        }

        var isHTTPS = localStorage.getItem("HttpsSetting");
        var proto = isHTTPS === "True" ? "https://" : "http://";
        var url = proto + cur.url;

        eisbaerServer.index = index;
        eisbaerServer.localPath = ""; // will be initialized later
        eisbaerServer.server = this.server = url;
        eisbaerServer.port = this.port = cur.port;
        eisbaerServer.wsPort = cur.wsPort;
        eisbaerServer.tls = cur.tls == 1;
        eisbaerServer.requestInterval = this.requestInterval =
          cur.requestInterval || 500;
        eisbaerServer.usePortal = cur.use_portal;
        eisbaerServer.portalUser = cur.portal_user;
        eisbaerServer.portalPass = cur.portal_pass;
        //eisbaerServer.portalIndex = cur.portal_index;
        this.user = cur.eis_user;
        this.pass = cur.eis_pass;
        this.serverName = cur.name;
        validServer = true;
        break;
      }
      ++index;
    }
    if (!validServer) {
      this.serverIndex = 0;
    }
    if (validServer) {
    }
    return validServer;
  },

  preSync: function () {
    eisbaerSync.authFailed = false;
    $.mobile.loading("show", {
      text: t("connecting"),
      textVisible: true,
      theme: "c",
      html: "",
    });
    // give the dialog some time to show up
    setTimeout(this.sync.bind(this), 200);
  },

  sync: function (serverIndex, tryPortal) {
    var validServer =
      serverIndex === undefined
        ? this.setNextServer()
        : this.setServer(serverIndex, tryPortal);

    if (!validServer && serverIndex !== undefined) {
      return;
    }

    // try authentication
    var successFunc = async function (success) {
      if (!success) {
        // not authenticated
        eisbaerSync.authFailed = true;
        errorFunc();
        return;
      }
      eisbaerSync.authFailed = false;
      var statusInfoServer = await eisbaerSync.getStatusInfo();
      if (statusInfoServer) {
        if (!eisbaerVersion.canConnect(statusInfoServer)) {
          return;
        }
        var xml = $(statusInfoServer.SLNID);
        var slnid = xml.attr("ID");

        if (cordova.platformId == "browser") {
          eisbaerServer.localPath = "eisbaer-" + slnid + "-";
          setLocalFilePath(slnid, xml, statusInfoServer, success);
        } else {
          const resolvePath =
            cordova.platformId.toLowerCase() == "ios"
              ? cordova.file.dataDirectory
              : cordova.file.dataDirectory;
          window.resolveLocalFileSystemURL(
            cordova.file.dataDirectory,
            (entry) => {
              eisbaerServer.localPath =
                cordova.platformId.toLowerCase() == "ios"
                  ? entry.toInternalURL() + "eisbaer/" + slnid + "/"
                  : cordova.file.dataDirectory + "eisbaer/" + slnid + "/";
              eisbaerServer.tempDirectoryPath = eisbaerServer.localPath;
              eisbaerServer.tempAbsolutePath =
                entry.toURL() + "eisbaer/" + slnid + "/";
              eisbaerServer.imageDirectoryPath =
                entry.toInternalURL() + "eisbaer/" + slnid + "/img";
              setLocalFilePath(slnid, xml, statusInfoServer, success);
              //===========>old code add 17-07-23
              //  eisbaerServer.localPath = entry.toInternalURL() + 'eisbaer/' + slnid + '/';
            }
          );
          if (cordova.platformId.toLowerCase() == "ios") {
            window.resolveLocalFileSystemURL(
              cordova.file.tempDirectory,
              (entry) => {
                eisbaerServer.tempDirectoryPath =
                  entry.toInternalURL() + "eisbaer/" + slnid + "/";
                eisbaerServer.tempAbsolutePath =
                  entry.toURL() + "eisbaer/" + slnid + "/";
              }
            );
          }
        }
      } else {
        $.mobile.loading("hide");
      }
    };

    var setLocalFilePath = function (slnid, xml, statusInfoServer, success) {
      eisbaerSettings.load(slnid);
      eisbaerSettings.registerSolution(slnid, statusInfoServer.SLN.FN);
      eisbaerServer.solutionId = slnid;
      eisbaerServer.lastModified = statusInfoServer.SLNINF.FLST.match(/\d+/)[0];

      // init sip
      window.sipclient.init(function () {});

      var cFileCount = statusInfoServer.PRJ.CustomVariableFiles.length;

      for (var i = 0; i < cFileCount; ++i) {
        var filename = statusInfoServer.PRJ.CustomVariableFiles[i].FN;
        if (filename.endsWith(".xml")) {
          var tmp = statusInfoServer.PRJ.CustomVariableFiles[i].FN.split(".");
          eisbaerLanguages.push(tmp[0]);
        }
      }

      if (!eisbaerLanguages.length) {
        eisbaerLanguages = ["zh-CN","de-DE", "en-US"];
      }

      if (cordova.platformId == "browser") {
        var zipUrl =
          "http://eisforward:80/test/" +
          slnid +
          ".zip?_lm=" +
          eisbaerServer.lastModified;
        if (eisbaerServer.usePortal == "yes") {
          zipUrl =
            "/userdata/" + slnid + ".zip?_lm=" + eisbaerServer.lastModified;
            console.log("******************************356", zipUrl);
          zipUrl = eisbaerServer.camUrl(zipUrl);
          console.log("🚀 ~ setLocalFilePath ~ zipUrl: **************************358", zipUrl)
        } else {
          zipUrl = eisbaerServer.getUrl(
            "WebServer/" +
              slnid.toLowerCase() +
              "/Archiv.zip?_lm=" +
              eisbaerServer.lastModified
          );
          console.log('TCL ->  ~ setLocalFilePath ~ zipUrl:', zipUrl);
        }
        JSZipUtils.getBinaryContent(zipUrl, function (err, data) {
          if (err || (data instanceof ArrayBuffer && !data.byteLength)) {
            alert("Could not download project archive.");
            return;
          }

          JSZip.loadAsync(data).then(function (zip) {
            eisbaerServer.zip = zip;
            syncReady.resolve();
          });
        });
        return;
      }

      var filePath = eisbaerServer.localPath + "statusinfo.txt";
      // setTimeout(() => {
      FileClient.readFileContent(
        filePath,
        function (content) {
          eisbaerSync.syncFiles(statusInfoServer, JSON.parse(content));
        },
        function (error) {
          eisbaerSync.syncFiles(statusInfoServer, false);
        }
      );
      // }, 3000);
    };

    var errorFunc = function () {
      // if all servers are tried for n times...stop trying and bring up dialog
      if (eisbaerSync.serverIndex == 0) {
        if (eisbaerServer.usePortal == "auto" && !tryPortal) {
          //eisbaerSync.tryPortal = true;
          eisbaerSync.sync(serverIndex, true);
        } else {
          // next server to try is the first server -> all servers tried
          eisbaerSync.dialogFailed();
        }
        return;
      } else {
        eisbaerSync.sync();
        return;
      }
    };
    if (validServer) {
      $.mobile.loading("show", {
        text:
          t(
            eisbaerServer.usePortal == "yes"
              ? "connecting_portal"
              : "connecting"
          ) +
          ": " +
          this.serverName,
        textVisible: true,
        theme: "c",
        html: "",
      });

      eisbaerUser.authenticate(this.user, this.pass, successFunc, errorFunc);
    } else {
      errorFunc();
    }
  },

  syncFiles: function (statusInfoServer, statusInfoClient) {
    var download = false;
    if (statusInfoClient) {
      // sync solution info
      eisbaerSync.copyToTempDirectory();
      window.newCopyFilesToTempDirectory();
      if (statusInfoServer.SLNINF.FLST != statusInfoClient.SLNINF.FLST) {
        download = true;
      } else {
        // statusinfo did not change
        syncReady.resolve();
      }
    } else {
      download = true;
    }

    if (download) {
      var url, path;
      $.mobile.loading("show", {
        text: t("data_downloading"),
        textVisible: true,
        theme: "c",
        html: "",
      });

      this.syncUserFile();
      this.syncSolutionInfo();
      //this.syncMediaLibrary();
      this.syncMediaLibraryNew();
      this.syncViewModels(statusInfoServer);
      this.syncCustomVariables(statusInfoServer);

      var downloadDoneFunc = function () {
        // save new statusinfo
        var fileName = eisbaerServer.localPath + "statusinfo.txt";
        var successFunc = function (data) {};
        var errorFunc = function (error) {};

        //=>==============new one
        FileClient.writeToFile(
          encodeURI(fileName),
          JSON.stringify(statusInfoServer),
          successFunc,
          errorFunc,
          "eisbaerSync"
        );

        //=>==================old one
        // FileClient.writeToFile(fileName, JSON.stringify(statusInfoServer), successFunc, errorFunc);

        eisbaerSync.downloadComplete = true;
        this.checkSyncComplete();
      }.bind(this);

      eisbaerDownload.onComplete = function (failedDownloads) {
        if (!failedDownloads) {
          downloadDoneFunc();
          return;
        }

        var onConfirm = function (buttonIndex) {
          switch (buttonIndex) {
            default:
            case 1: //re-try
              eisbaerDownload.restart();
              break;
            case 2: // ignore
              downloadDoneFunc();
              break;
            case 3: // abort
              eisbaerMode.goHome();
              break;
          }
        };
        $.mobile.loading("hide");
        // show a message what to do: restart,re-download failed,ignore
        navigator.notification.confirm(
          t("failed_downloads_msg"), // message
          onConfirm, // callback to invoke with index of button pressed
          t("failed_downloads"), // title
          [t("bu_retry"), t("bu_ignore"), t("bu_cancel")] // buttonLabels
        );
      }.bind(this);

      //sync view models
      var afterDelete = function () {
        eisbaerDownload.start();
      }.bind(this);
      this.deleteViewModels(afterDelete);
    } else {
      eisbaerSync.copyToTempDirectory();
      window.newCopyFilesToTempDirectory();
    }
  },
  syncSolutionInfo: function () {
    var url = eisbaerServer.getUrl("ReqSIFile");
    var filePath = eisbaerServer.localPath + "solutioninfo.xml";

    eisbaerDownload.add({
      url: url,
      path: filePath,
      convert: true,
    });
  },
  syncMediaLibraryNew: function () {
    var _self = this;
    // reset saved data
    eisbaerMediaLibrary.styleElement.empty();
    eisbaerMediaLibrary.loaded = {};
    eisbaerMediaLibrary.data = {};

    var slnId = eisbaerServer.solutionId.toLowerCase();
    var zipUrl = eisbaerServer.getUrl(
      "WebServer/" + slnId + "/Archiv.zip?_lm=" + eisbaerServer.lastModified
    );
    console.log('TCL ->  ~ zipUrl:', zipUrl);
    const stripTrailingSlash = (str) => {
      return str.endsWith("/") ? str.slice(0, -1) : str;
    };

    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, (entry) => {
      xhr.onload = function () {
        if (this.status == 200) {
          window.localStorage.setItem("localMedia", "false");
          var dataObj = new Blob([this.response], { type: "text/plain" });
          const fileName = "Archiv.zip";

          entry.getFile(
            fileName,
            { create: true, exclusive: false },
            function (fileEntry) {
              fileEntry.createWriter(function (fileWriter) {
                fileWriter.onwriteend = function () {
                  if (dataObj.type == "text/plain") {
                    fileEntry.file(
                      function (file) {
                        var reader = new FileReader();
                        reader.onloadend = function () {
                          // displayFileData(fileEntry.fullPath + ": " + this.result);

                          var data = new Blob([new Uint8Array(this.result)], {
                            type: "text/plain",
                          });

                          JSZip.loadAsync(data)
                            .then(function (zip) {
                              // load eisbaerMedia.json from zip
                              var mediaJson = zip.file("eisbaerMedia.json");
                              if (mediaJson) {
                                mediaJson
                                  .async("string")
                                  .then(function (content) {
                                    eisbaerMediaLibrary.data =
                                      JSON.parse(content);
                                    var imagesToDownload = 0;
                                    var imagesDownloaded = 0;

                                    var checkDone = function () {
                                      if (
                                        imagesDownloaded >= imagesToDownload
                                      ) {
                                        eisbaerSync.copyToTempDirectory();
                                        window.newCopyFilesToTempDirectory();
                                        eisbaerSync.syncMediaLibraryComplete = true;
                                        eisbaerSync.checkSyncComplete();
                                      } else if (!eisbaerDownload.active) {
                                        eisbaerSync.syncMediaLibraryComplete = true;
                                        eisbaerSync.checkSyncComplete();
                                      }
                                    };

                                    var successFunc = function () {
                                      ++imagesDownloaded;
                                      checkDone();
                                    };

                                    var errorFunc = function (error) {
                                      ++imagesDownloaded;
                                      checkDone();
                                    };

                                    for (var id in eisbaerMediaLibrary.data) {
                                      var cur = eisbaerMediaLibrary.data[id];
                                      if (cur.type === "image") {
                                        var url = eisbaerServer.getUrl(
                                          "WebServer/" +
                                            slnId +
                                            "/Image_" +
                                            id +
                                            ".png?_lm=" +
                                            eisbaerServer.lastModified
                                        );
                                        var localPath =
                                          stripTrailingSlash(
                                            eisbaerServer.localPath
                                          ) +
                                          "/" +
                                          id +
                                          ".png";
                                        cur.image = localPath;
                                        ++imagesToDownload;
                                        eisbaerDownload.add({
                                          url: url,
                                          path: localPath,
                                          success: successFunc,
                                          error: errorFunc,
                                        });
                                      }
                                    }
                                    eisbaerMediaLibrary.saveData();

                                    if (imagesToDownload === 0) {
                                      // instant finish
                                      checkDone();
                                    } else {
                                      if (!eisbaerDownload.active) {
                                        eisbaerDownload.start();
                                      }
                                    }
                                  });
                              } else {
                                eisbaerSync.syncMediaLibrary(); // try old school
                              }
                            })
                            .catch(function (reason) {
                              eisbaerSync.syncMediaLibrary(); // try old school
                            });
                        };
                        reader.readAsArrayBuffer(file);
                      },
                      function (error) {
                        console.log(
                          "TCL ->  ~ file: eisbaerSync.js:612 ~ error:",
                          error
                        );
                      }
                    );
                  } else {
                    console.log(
                      "TCL ->  ~ file: eisbaerSync.js:615 ~ fileEntry:",
                      fileEntry
                    );
                    // readFile(fileEntry);
                  }
                };

                fileWriter.onerror = function (e) {};
                fileWriter.write(dataObj);
              });
            },
            function (error) {}
          );
        } else {
          eisbaerSync.syncMediaLibrary(); // try old school
          return;
        }
      };
      xhr.open("GET", zipUrl, true);
      xhr.responseType = "blob";
      xhr.send();
    });
  },
  syncMediaLibrary: function () {
    // reset saved data
    eisbaerMediaLibrary.styleElement.empty();
    eisbaerMediaLibrary.loaded = {};
    eisbaerMediaLibrary.data = {};
    var filePath = eisbaerServer.localPath + "eisbaerMedia.json";
    // FileClient.removeFile(filePath, function () {});

    var self = this;
    var url = eisbaerServer.getUrl("ReqDbFile?x=MediaLibrary.EisDB");
    filePath = eisbaerServer.localPath + "MediaLibrary.db";
    if (cordova.platformId == "browser") {
      url = "http://eisforward/test/sqlite.php";
      filePath = eisbaerServer.localPath + "eisbaerMedia.json";
    }

    var successFunc = function (data) {
      self.syncMediaLibraryComplete = true;
      window.localStorage.setItem("localMedia", "true");
      self.checkSyncComplete();
      window.newCopyFilesToTempDirectory();
    };

    var errorFunc = function (error) {
      self.syncMediaLibraryComplete = true;
      self.checkSyncComplete();
    };
    eisbaerDownload.add({
      url: url,
      path: filePath,
      success: successFunc,
      error: errorFunc,
    });
    if (!eisbaerDownload.active) {
      eisbaerDownload.start();
    }
  },

  syncUserFile: function () {
    //var url = this.server + ":" + this.port + this.path + "ReqUFile";
    var url = eisbaerServer.getUrl("ReqUFile");
    var filePath = eisbaerServer.localPath + "users.txt";
    eisbaerDownload.add({
      url: url,
      path: filePath,
    });
  },

  deleteViewModels: function (callback) {
    callback = callback || function () {};
    var filePath = eisbaerServer.localPath + "viewmodels";
    FileClient.removeFilesInADirectory(filePath, callback, callback);
  },

  syncViewModels: function (statusInfo) {
    var self = this;
    var url, filePath, ppcid;
    var pageCount = statusInfo.PRJ.PageViewModels.length;
    for (var i = 0; i < pageCount; i++) {
      ppcid = $(statusInfo.PRJ.PageViewModels[i].ID).text();
      //url = self.server + ":" + self.port + self.path + "ReqPVMFile?x="+ppcid;
      url = eisbaerServer.getUrl("ReqPVMFile?x=" + ppcid);
      filePath = eisbaerServer.localPath + "viewmodels/PVM_" + ppcid;
      eisbaerDownload.add({
        url: url,
        path: filePath,
      });

      //url = self.server + ":" + self.port + self.path + "ReqVMFile?x="+ppcid;
      url = eisbaerServer.getUrl("ReqVMFile?x=" + ppcid);
      filePath = eisbaerServer.localPath + "viewmodels/VM_" + ppcid;
      eisbaerDownload.add({
        url: url,
        path: filePath,
      });
    }
  },

  syncCustomVariables: function (statusInfo) {
    var url, filePath;
    var count = statusInfo.PRJ.CustomVariableFiles.length;
    for (var i = 0; i < count; i++) {
      var filename = statusInfo.PRJ.CustomVariableFiles[i].FN;
      if (filename.endsWith(".xml")) {
        //url = this.server + ":" + this.port + this.path + "ReqCVFile?x="+filename;
        url = eisbaerServer.getUrl("ReqCVFile?x=" + filename);
        filePath = eisbaerServer.localPath + filename + ".cvar";
        eisbaerDownload.add({
          url: url,
          path: filePath,
          success: function (downInfo) {
            var path = eisbaerServer.localPath + downInfo.name;
            if (cordova.platformId == "browser") {
              path = downInfo.name;
            }
            this.parseVariables(path);
          }.bind(this),
        });
      }
    }
  },

  checkSyncComplete: function () {
    if (this.downloadComplete && this.syncMediaLibraryComplete) {
      syncReady.resolve();
    }
    eisbaerSync.copyToTempDirectory();
    window.newCopyFilesToTempDirectory();
  },

  convertToJson: function (path, successHandler, errorHandler) {
    FileClient.readFileContent(
      path,
      function (content) {
        FileClient.writeToFile(
          path + ".json",
          JSON.stringify($.xml2json(content, true)),
          function () {
            //TODO: delete xml file ?
            if (successHandler) successHandler();
          },
          function (error) {
            if (errorHandler) errorHandler();
          },
          "eisbaerSync1"
        );
      },
      function (error) {
        if (errorHandler) errorHandler();
      }
    );
  },

  parseVariables: function (path, successHandler, errorHandler) {
    FileClient.readFileContent(
      path,
      function (content) {
        var variables = {};
        var xmlString = content.substr(
          content.indexOf("<"),
          content.lastIndexOf(">") + 1
        );
        $(xmlString)
          .find("variable")
          .each(function () {
            variables[$(this).attr("Key")] = $(this).text();
          });
        path = path.replace(".cvar", "");

        FileClient.writeToFile(
          path + ".json",
          JSON.stringify(variables),
          function () {
            //TODO: delete xml file ?
            if (successHandler) successHandler();
          },
          function (error) {
            if (errorHandler) errorHandler();
          },
          "eisbaerSync3"
        );
      },
      function (error) {
        if (errorHandler) errorHandler();
      }
    );
  },
};
