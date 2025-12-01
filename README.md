# Eisbaer webapp 增加语言

EisBaer SCADA是德国Alexander Maier公司开发的工业自动化监控与数据采集系统，专为智能建筑和设施管理设计，支持多种工业通信协议和系统集成。
默认web登录界面是德文，控件语言是德文和英文。如用户需修改web语言，可参考如下步骤
 <br/> <br/>
1，修改登录界面的语言
用记事本类文本编辑软件打开C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\index.html <br/>
找到并修改 <br/> <br/>
Eisbaer Benutzer >> Eisbaer 账号 <br/>
Gast >> Guest <br/>
Eisbaer Passwort >> Eisbaer 密码 <br/>
Verbinde... >> 登录中... <br/>
Absenden >> 登录 <br/>

修改完成后，用UTF-8格式保存。

2，修改登录界面的报错内容 <br/>
C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\js\webApp.js  <br/>

Fehler! >> 错误！ <br/>
Authentifizierung fehlgeschlagen >> 认证失败 <br/>
Verbindung zum Eisbaer Server fehlgeschlagen >> 连接到Eisbaer服务器失败  <br/>

3，增加控件的默认语言 <br/>
C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\Webapp\js\eisbaer\eisbaerSync.js

        eisbaerLanguages = ["de-DE", "en-US"];
增加中文语言zh-CN

        eisbaerLanguages = ["zh-CN","de-DE", "en-US"];
          
4，修改控件的翻译文件，增加中文内容 <br/>
4.1，日历编辑控件 <br/>
C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\Webapp\js\eisbaer\components\calendarEditorComponent\translation.js <br/>
在en:{英文翻译}语言后，添加 <br/>

, <br/>
zh: { 中文翻译 <br/>
}
	<br/>其余控件的修改方式相似。	<br/>
5，C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\Webapp\index.html<br/>
修改默认语言<br/>

var locale = ‘zh_CN’;<br/>

6,C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\Webapp\js\eisbaer\eisbaerLocale.js<br/>
替换部分内容为zh
