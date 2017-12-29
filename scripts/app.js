$(function() {
    $("#content_splitter").ejSplitter({
        height: window.innerHeight - 400,
        width: "100%",
        enableAutoResize: true,
        create: function(args) {
            setTimeout(function() {
                var splitObj = $("#content_splitter").ejSplitter("instance");
                splitObj.refresh()
            }, 500);
        }
    });
    $("#outterSpliter").ejSplitter({
        height: window.innerHeight - 100,
        orientation: ej.Orientation.Vertical,
        properties: [{ paneSize: 370 }, { paneSize: 100 }],
        width: "100%",
        enableAutoResize: true,
    });
    $("#run_btn").ejButton({
        showRoundedCorner: true,
        click: "convert",

    });
    $("#clear_btn").ejButton({
        showRoundedCorner: true,
        size: "small",
        click: "clear"
    });
    editor = CodeMirror(document.getElementById("left_pane"), {
        mode: "text/javascript",
        value: "//Paste your EJ1 code here!" + document.getElementById('ej1').value,
        lineNumbers: true,
        lineWrapping: true,
        styleActiveLine: true
    });
    tseditor = CodeMirror(document.getElementById("right_pane"), {
        mode: "text/javascript",
        value: "Get your converted EJ2 Code from here!",
        lineNumbers: true
    });
    editor.on("inputRead,", function() {
        editor.display.cursorDiv.firstChild.textContent = "";
    })
});
window.addEventListener('resize', function() {
    var splitterObj = $("#content_splitter").ejSplitter("instance");
    splitterObj.setModel({
        height: window.innerHeight - 200
    })
})

function convert() {
    document.getElementById('ej1').value = editor.getValue();
    window.deprecated = [];
    var code = document.getElementById('ej1').value;
    var controls = code.match(/\$((.|\n)*?)\);/gm);
    var ejComponents = ['ejButton', 'ejCheckBox', 'ejToggleButton', 'ejCheckBox', 'ejRadioButton', 'ejAutocomplete', 'ejDatePicker', 'ejToolbar'];
    var ej1Obj = { id: "", component: "", properties: {} },
        ej2Obj = {};
    var ej1Coll = [],
        ej2Coll = [],
        mainString = "";
    try {
        for (var i = 0; i < controls.length; i++) {
            ej1Coll.push({ id: "", component: "", properties: {} });
            controls[i] = controls[i].replace(/(\r\n|\n|\r)/gm, "").trim();
            var id = controls[i][2] == "\""? controls[i].match(/"#.*?"/gm)[0] : controls[i].match(/'#.*?'/gm)[0];
            ej1Coll[i].id = id.indexOf('#') == -1 ? id.substr(0, id.length - 1).substr(1) : id.substr(0, id.length - 1).substr(2);
            var comp = controls[i].match(/\.ej.*?\(/gm)[0];
            ej1Coll[i].component = comp = comp.substr(0, comp.length - 1).substr(1);
            var prop = controls[i].match(/\(\{((.|\n)*?)}\)/gm)[0];
            ej1Coll[i].properties = eval('(' + prop + ')');
            ej2Coll[i] = $.extend(true, {}, ej1Coll[i]);
            ej2Coll[i].properties = {};
            var prop = controlsList[comp];
            ej2Coll[i].properties = objectMapping(ej1Coll[i].properties, ej2Coll[i].properties, prop, comp);
            var id = comp.split("ej")[1].toLowerCase() + uniqueID();
            var convertedStr = convertToString(ej2Coll[i].properties, false);
            var firstLine = "let" + " " + id + ': ' + comp.split("ej")[1] + "= new" + " " + comp.split("ej")[1] + "(" + convertedStr + ")";
            var secondLine = id + "." + "append(" + "'" + "#" + ej1Coll[i].id + "'" + ")";
            mainString += firstLine + ';' + '\n' + secondLine + ';\n'
        }
        tseditor.setValue(mainString);
        showDeprecationMsg(ej1Coll);
    } catch (e) {
        tseditor.setValue(e.message);
    }
}

function clear() {
    editor.setValue("");
}

function uniqueID() {
    var text = "";
    var possible = "0123456789";
    for (var i = 0; i < 2; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

function objectMapping(ej1Obj, ej2Obj, prop, control) {
    var keys = Object.keys(ej1Obj);
    for (var i = 0; i < keys.length; i++) {
        if (typeof(ej1Obj[keys[i]]) == "object" && (ej1Obj[keys[i]]).join == undefined && prop[keys[i]].indexOf("deprecated") < 0) {
            ej2Obj[prop[keys[i]]] = {};
            ej2Obj[prop[keys[i]]] = objectMapping(ej1Obj[keys[i]], ej2Obj[prop[keys[i]]], prop, control);
        } else if (typeof(ej1Obj[keys[i]]) == "object" && !(ej1Obj[keys[i]]).join == undefined && prop[keys[i]].indexOf("deprecated") < 0)
            ej2Obj[prop[keys[i]]] = ej1Obj[keys[i]];
        else if (prop[keys[i]] && prop[keys[i]].indexOf("deprecated") < 0) {
            if (prop[keys[i]] === "disabled")
                ej2Obj[prop[keys[i]]] = !ej1Obj[keys[i]];
            else
                ej2Obj[prop[keys[i]]] = ej1Obj[keys[i]];
        } else {
            text = control + ":" + [keys[i]] + ":" + prop[keys[i]].replace("deprecated-", "");
            deprecated.indexOf(text) < 0 && deprecated.push(text);
        }
    }
    return ej2Obj;
}

function convertToString(obj, isArray) {
    var convString = [],
        arrSep, objSep;
    if (typeof(obj) == "object" && (obj.join == undefined)) {
        convString.push("{");
        !isArray && convString.push("\n");
        for (prop in obj) {
            objSep = prop;
            convString.push(prop, ": ", convertToString(obj[prop]));
            keys = Object.keys(obj);
            if (keys[keys.length - 1] != objSep)
                convString.push(",");
            !isArray && convString.push("\n");
        }
        convString.push("}");
    } else if (typeof(obj) == "object" && !(obj.join == undefined)) {
        convString.push("[");
        isArray = true;
        for (prop in obj) {
            arrSep = prop;
            convString.push(convertToString(obj[prop], isArray));
            keys = Object.keys(obj);
            if (keys[keys.length - 1] != arrSep) {
                convString.push(",");
                convString.push("\n");
            }
        }
        convString.push("]");
        isArray = false;
    } else if (typeof(obj) == "function") {
        convString.push(obj.toString())
    } else {
        convString.push(JSON.stringify(obj))
    }
    return convString.join("")
}

function showDeprecationMsg(controls) {
    var msg = deprecated,
        splitStr, dup;
    var elem = document.getElementById("deprecated_ontainer"),
        deprStr = "<h2>Comments</h2>\n";
    $(elem).empty();
    for (var c = 0, cLen = controls.length; c < cLen; c++) {
        dup = $.extend(true, [], deprecated);
        Object.keys(deprecated).length && (deprStr += "<h2>" + controls[c].component + "</h2>\n");
        for (var msg = 0; msg < Object.keys(deprecated).length; msg++) {
            splitStr = deprecated[msg].split(":");
            if (splitStr[0] === controls[c].component) {
                deprStr += "<h3>" + splitStr[1] + ":" + splitStr[2] + "</h3>\n";
                delete dup[msg];
            }
        }
        deprecated = dup;
        deprecated.length = dup.length;
    }
    $(elem).append($(deprStr));
}