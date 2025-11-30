function startWebApp (eisUser, eisPass){
    // create server
    var server = {
        name: "Eisbaer",
        url: eisbaerConfig.host,
        port: eisbaerConfig.port,
        wsPort: eisbaerConfig.wsPort,
        tls: eisbaerConfig.tls,
        requestInterval: 500,
        eis_user: eisUser,
        eis_pass: eisPass,
        portal_user: "",
        portal_pass: "",
        portal_index: 1,
        use_portal: "no",
        valid: "2049123100"
    };
    // this wipes out all configured servers
    var config = {
        1: server
    };

    localStorage.setItem("eisbaer-servers", JSON.stringify(config));
    window.location = eisbaerConfig.webAppPath;

//        $('html').addClass('fullscreen');
//        var iframe = $('<iframe src="/webapp2" />');
//        $('body').empty().append(iframe);
}

var queryDict = {};
window.location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});

$(function(){
    $('form input').
    attr('autocapitalize', 'off').
    attr('autocorrect', 'off').
    attr('autocomplete', 'off').
    attr('spellcheck', 'false');

    $('form').on("submit", function(e){
        e.preventDefault();
        $('form .alert').remove();
        var button = $(this).find('button[type="submit"]');
        button.button("loading");

        var eisUser = $('input[name="eis_user"]').val();
        var eisPass = $('input[name="eis_pass"]').val();

        var onSuccess = function(result){
            console.log(result);
            if (result == true){
                startWebApp(eisUser, eisPass);
            } else {
                button.button("reset");
                $('form .alert').remove();
                $('form').prepend('<div class="alert alert-danger"><strong>错误!</strong> 认证失败</div>');
            }
        };

        var onError = function(err){
            $('form .alert').remove();
            $('form').prepend('<div class="alert alert-danger"><strong>错误!</strong> 连接Eisbaer 服务器失败</div>');
            console.log(err);
            button.button("reset");
        };

        checkUser.authenticate(eisUser, eisPass, onSuccess, onError);
    });

    console.log(queryDict);

    "eis_user" in queryDict && $('input[name="eis_user"]').val(queryDict["eis_user"]);
    "eis_pass" in queryDict && $('input[name="eis_pass"]').val(queryDict["eis_pass"]);

    if (queryDict["submit"] == 1){
        $('form').trigger('submit');
    }
});
