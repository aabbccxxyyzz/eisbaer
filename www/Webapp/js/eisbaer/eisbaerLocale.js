var eisbaerLocale = {
  locale: 'zh_CN',
  supportedLocales: ['zh_CN','de_DE', 'en_US'],
  strings: {},
  key: 'en',
  translate: function (variable, params) {
    var key = eisbaerLocale.key;
    if (eisbaerLocale.strings[key]) {
      if (eisbaerLocale.strings[key][variable]) {
        var txt = eisbaerLocale.strings[key][variable];
        if (params) {
          params = Array.isArray(params) ? params : [params];
          for (var i = 0; i < params.length; ++i) {
            txt = txt.replace('{$' + (i + 1) + '}', params[i]);
          }
        }
        return txt;
      } else {
        return variable;
      }
    } else {
      return variable + '?';
    }
  },
  init: function () {
    var successFunc = function (locale) {
      var loc = locale.value;

      // check if a valid locale
      if (eisbaerLocale.supportedLocales.indexOf(loc) == -1) {
        if (loc.substring(0, 2) == 'zh') {
          loc = 'zh_CN';
        } else {
          loc = 'en_US';
        }
      }

      eisbaerLocale.key = loc.substring(0, 2);

      // load translation file
      if (eisbaerLocale.locale != loc) {
        eisbaerLocale.locale = loc;
        eisbaerLocale.loadStrings();
      }

      window.localStorage.setItem('locale', loc);

      //eisbaerLocale.loadStrings();
    };
    var errorFunc = function () {};
    if (navigator.globalization) {
      navigator.globalization.getPreferredLanguage(successFunc, errorFunc);
    }
  },
  loadStrings: function () {
    $('head').append('<script type="text/javascript" src="js/locale/locale-de-DE.js" />');
    $('head').append('<script type="text/javascript" src="js/locale/locale-en-US.js" />');
  },

  translatePage: function () {
    if (!this.strings[this.key]) {
      return;
    }

    $('[data-translate="true"]').each(function () {
      var newText = eisbaerLocale.translate($(this).attr('data-translation'));

      if (this.outerHTML.indexOf('$TR:') != -1) {
        var pattern = /\$TR:([a-z0-9_]+)\$/g;
        var match;
        var tempText = this.outerHTML;
        while ((match = pattern.exec(this.outerHTML))) {
          newText = eisbaerLocale.translate(match[1]);
          tempText = tempText.replace(match[0], newText);
        }
        this.outerHTML = tempText;
      } else {
      }

      return true;
    });
  },
  getLang: function () {
    var target = 'en';
    var lang = eisbaerSettings.get('global', 'language');

    if (!lang) {
      lang = eisbaerLocale.locale;
    }

    if (lang && lang.toLowerCase().substr(0, 2) == 'zh') {
      target = 'zh';
    }

    return target;
  },
  translateComponent: function (text) {
    // select language by current project language
    var target = 'en';
    var lang;

    lang = eisbaerSettings.get('global', 'language');

    if (!lang) {
      lang = eisbaerLocale.locale;
    }
    /*
		if (eisbaerLanguages.length){
			lang = window.localStorage.getItem('language');
		} else {
			lang = eisbaerLocale.locale;
		}
		*/
    if (lang && lang.toLowerCase().substr(0, 2) == 'zh') {
      target = 'zh';
    }

    if (this.strings && this.strings.hasOwnProperty(target) && this.strings[target].hasOwnProperty(text)) {
      return this.strings[target][text]; // this = component
    } else if (eisbaerLocale.strings[target] && eisbaerLocale.strings[target].hasOwnProperty(text)) {
      return eisbaerLocale.strings[target][text];
    } else {
      window['missingTranslations'] = window['missingTranslations'] || {};
      window['missingTranslations'][text] = text;
      return text;
    }
  },
};

var t = eisbaerLocale.translate; // shortcut
eisbaerLocale.key = eisbaerLocale.locale.substring(0, 2);
eisbaerLocale.loadStrings();
// load locale
/*
var currentLocale = window.localStorage.getItem('locale') || 'en_US';
eisbaerLocale.locale = currentLocale;
var url = 'js/locale/locale-'+currentLocale.replace('_','-')+'.json';
$('head').append('<script type="text/javascript" src="'+url+'" />');
*/
$(function () {
  try {
    eisbaerLocale.translatePage();
  } catch (e) {}
});
