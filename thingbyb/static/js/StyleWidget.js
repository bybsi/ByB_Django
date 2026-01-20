var _styleWidget = {
    headerHex: "",
    headerOpa: "",

    setContentLayout: function(classAffix) {
        let cpc = document.getElementById('content_post_container');
        if (cpc)
            cpc.className = "content_layout" + classAffix;
    },
    setContentHeaderColor: function(colorHex) {
        $(".post_header").css('background-color', '#'+colorHex+this.headerOpa);
        $("._byb_orders_header").css('background-color', '#'+colorHex+this.headerOpa);
        this.headerHex = colorHex;
    },
    setContentHeaderTextColor: function(colorHex) {
        $(".post_header").css('color', '#'+colorHex);
        $("._byb_orders_header").css('color', '#'+colorHex);
    },
    setContentHeaderOpacity: function(opacityHex) {
        $(".post_header").css('background-color', '#' + this.headerHex + opacityHex);
        $("._byb_orders_header").css('background-color', '#' + this.headerHex + opacityHex);
        this.headerOpa = opacityHex;
    },
    setBodyBackground: function(bg) {
        $("body").css('background','');
        $("body").css('background', 'fixed ' + 
         (bg[0] == '#' ? 
                'linear-gradient(135deg, '+bg+', #00000000)' :
          bg[0] == 'S' ?
                bg.substring(1) :
                'url(/images/'+bg+'.jpg)'));
        $("body").css('background-size', 'cover');
    },
    enableButtons: function() {
        $("#style_widget_save").off().on('click', function() {
            _user.save();
        }).show();
        $("#style_widget_close").off().on('click', function() {
            _user.set('style_widget', 'disabled');
            _user.save("Re-enable styles in the settings.");
            $("#style_widget").hide();
        }).show();
        $("#style_widget_share").off().on('click', function() {
            pageOkay("Send a layout to someone in channels, it changes for them automatically in real time and they can't do anything about it! coming soon&trade;");
        }).show();
    },
    initSave: function() {
        $("#style_widget_save").off().on('click', function() {
            if (_user)
                _user.save();
            else
                pageError("Please login to save a layout.");
        }).show();
    },
    initHide: function() {
        $("#style_widget_close").off().on('click', function() {
            $("#style_widget").hide();
        }).show();
    },

    display: function(show) {
        if (show)
            $("#style_widget").show();
        else
            $("#style_widget").hide();
    }
};

$(function(){
    $("#style_widget img.lyt").on('click', function() {
        let lyt = $(this).data('layout');
        _styleWidget.setContentLayout(lyt);
        if (_user != null)
            _user.set('lyt',lyt);
    });
    $(".style_widget_color").on('click', function() {
        let color = $(this).data('color');
        _styleWidget.setContentHeaderColor(color);
        if (_user != null)
            _user.set('hcolor',color);
    });
    $(".style_widget_bg").on('click', function() {
        let bg = $(this).data('bg');
        _styleWidget.setBodyBackground(bg);
        if (_user != null)
            _user.set('bg',bg);
    });
    $("#style_widget_opacity").on('click', function() {
        let opacity = $(this).val();
        let hex = parseInt($(this).val() * 2.55).toString(16);
        _styleWidget.setContentHeaderOpacity(hex);
        if (_user != null)
            _user.set('opa',hex);
    });
    $(".style_widget_text_color").on('click', function() {
        let color = $(this).data('color');
        _styleWidget.setContentHeaderTextColor(color);
        if (_user != null)
            _user.set('tcolor',color);
    });
});
