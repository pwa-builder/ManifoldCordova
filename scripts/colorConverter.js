'use strict';

var colorConstants = require('./colorConstants');

function isAlias(color) {
    return typeof colorConstants.colorsAlias[color.toLowerCase()] != 'undefined';
}

function isHexadecimal(color) {
    return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(color);
};

var rgbRegExp = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(0?\.?\d+))?\)$/;
function isRGB(color) {
    return rgbRegExp.test(color.toLowerCase());
}

var hslRegExp =/^hsla?\(\s*(0|[1-9]\d?|[12]\d\d|3[0-5]\d)\s*,\s*((0|[1-9]\d?|100)%)\s*,\s*((0|[1-9]\d?|100)%)\s*(?:,\s*(0?\.?\d+)?)?\)$/;  
function isHSL(color) {
    return hslRegExp.test(color.toLowerCase());
}

function fromHexadecimal(color, aChannel) {
    if (!isHexadecimal(color)) {
        throw new Error('The color passed has not a valid format: ' + color);
    }

    aChannel = aChannel || "ff";

    color = color.replace('#', '');
    if (color.length === 3) {
        color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
    }

    return "0x" + aChannel + color;
}

function fromAlias(color) {
    if (!isAlias(color)) {
        throw new Error('The color passed has not a valid format.');
    }
    var alphaChannel = 1;
    if (color === 'transparent') {
        alphaChannel = 0;
    }
    alphaChannel = getHexaWithPadding(alphaChannel * 255);

    var hexColor = colorConstants.colorsAlias[color.toLowerCase()];
    return fromHexadecimal(hexColor, alphaChannel);
}

function fromRGB(color) {
    if (!isRGB(color)) {
        throw new Error('The color passed has not a valid format: ' + color);        
    }
    var channels = rgbRegExp.exec(color);
    if (channels === null) {
        throw new Error('The color passed has not a valid format: ' + channels);
    }

    var hexaColor = "#" + getHexaWithPadding(channels[1]) + getHexaWithPadding(channels[2]) + getHexaWithPadding(channels[3]);

    var alphaChannel = "ff";

    if (channels.length == 5 && channels[4] != null) {
        //Convert Alpha Channel.
        alphaChannel = getHexaWithPadding(channels[4] * 255);
    }
    return fromHexadecimal(hexaColor, alphaChannel);
}

function fromHSL(color) {
    if (!isHSL(color)) {
        throw new Error('The color passed has not a valid format: ' + color);
    }

    var channels = hslRegExp.exec(color);
    if (channels === null) {
        throw new Error('The color passed has not a valid format: ' + channels);
    }

    var alphaChannel = "ff";
    if (channels.length == 7 && channels[6] != null) {
        //Convert Alpha Channel.
        alphaChannel = getHexaWithPadding(channels[6] * 255);
    }
    
    var rgb = hslToRgb(channels[1], channels[3], channels[5]);

    var hexaColor = "#" + getHexaWithPadding(rgb.r) + getHexaWithPadding(rgb.g) + getHexaWithPadding(rgb.b);
    return fromHexadecimal(hexaColor, alphaChannel);    
}

function toHexadecimal(color) {
    if (isAlias(color)) {
        return fromAlias(color);
    }
    if (isHexadecimal(color)) {
        return fromHexadecimal(color);
    }
    if (isRGB(color)) {
        return fromRGB(color);
    }
    if (isHSL(color)) {
        return fromHSL(color);
    }
    return null;
}

function hslToRgb(h, s, l) {
    var r, g, b;

    h = bound01(h, 360);
    s = bound01(s, 100);
    l = bound01(l, 100);

    function hue2rgb(p, q, t) {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1/6) return p + (q - p) * 6 * t;
        if(t < 1/2) return q;
        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }

    if(s === 0) {
        r = g = b = l; // achromatic
    }
    else {
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return { r: r * 255, g: g * 255, b: b * 255 };
}
function bound01(n, max) {
    if (isOnePointZero(n)) { n = "100%"; }

    var processPercent = isPercentage(n);
    n = Math.min(max, Math.max(0, parseFloat(n)));

    if (processPercent) {
        n = parseInt(n * max, 10) / 100;
    }

    if ((Math.abs(n - max) < 0.000001)) {
        return 1;
    }

    return (n % max) / parseFloat(max);
}
function isOnePointZero(n) {
    return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
}
function isPercentage(n) {
    return typeof n === "string" && n.indexOf('%') != -1;
}

function getHexaWithPadding(number) {
    var simpleHexa = parseInt(number).toString(16);
    var pad = "00";

    return (pad+simpleHexa).slice(-2);
}

module.exports = {
    isHexadecimal: isHexadecimal,
    isAlias: isAlias,
    isRGB: isRGB,
    isHSL: isHSL,

    fromHexadecimal: fromHexadecimal,
    fromAlias: fromAlias,
    fromRGB: fromRGB,
    fromHSL: fromHSL,

    toHexadecimal: toHexadecimal
}