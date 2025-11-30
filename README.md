# Eisbaer webapp 语言修改

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

2，修改报错内容
C:\Program Files\Alexander Maier GmbH\EisBär 4.0\www\js\webApp.js  <br/>

Fehler! >> 错误！ <br/>
Authentifizierung fehlgeschlagen >> 认证失败 <br/>
Verbindung zum Eisbaer Server fehlgeschlagen >> 连接到Eisbaer服务器失败  <br/>


          
