'use strict';
process.env.NODE_ENV = 'test';

var colorConverter = require('../colorConverter');

var assert = require('assert');

describe.only('colorConverter', function() {
    describe('isHexadecimal()', function() {
        it('Should return true if a six char with # Hexadecimal value is evaluated', function () {
            assert.ok(colorConverter.isHexadecimal("#000000"));
        });
        it('Should return false if a six char Hexadecimal value is evaluated', function () {
            assert.ok(!colorConverter.isHexadecimal("000000"));            
        });
        it('Should return true if a three char with # Hexadecimal value is evaluated', function () {
            assert.ok(colorConverter.isHexadecimal("#000"));            
        });
        it('Should return false if a three char Hexadecimal value is evaluated', function () {
            assert.ok(!colorConverter.isHexadecimal("000"));            
        });
        it('Should return false if a non Hexadecimal value is evaluated', function () {
            assert.ok(!colorConverter.isHexadecimal("lorem ipsum"));
        });        
    });
    describe('fromHexadecimal()', function () {
        it('Should return a four byte hex value if a six char Hexadecimal value passed', function() {
            assert.equal(colorConverter.fromHexadecimal("#123456"), '0xff123456');
        });
        it('Should return a four byte hex value if a three char Hexadecimal value passed', function() {
            assert.equal(colorConverter.fromHexadecimal("#123"), '0xff112233');            
        });
        it('Should throw an error if a non Hexadecimal value passed.', function () {
            var hasError = false;
            try {
                colorConverter.fromHexadecimal("ZZXXYY");
            } 
            catch (error) {
                hasError = true;
            }
            assert(hasError);
        });
    });
    describe('isAlias()', function () {
        it('Should return true if text is an alias', function () {
            assert.ok(colorConverter.isAlias('Blue'));
        });
        it('Should return false if text is not an alias', function () {
            assert.ok(!colorConverter.isAlias('lorem ipsum'));
        });
        it('Should return true if text is \'transparent\'', function() {
            assert.ok(colorConverter.isAlias('transparent'));
        })
    });
    describe('fromAlias()', function () {
        it('Should return a four byte hex value if the alias is valid', function () {
            assert.equal(colorConverter.fromAlias('blue'), '0xff0000ff');
        });
        it('Should return an error if the alias is not valid', function () {
            var hasError = false;
            try {
                colorConverter.fromAlias('loremItsum');
            }
            catch (error) {
                hasError = true;
            }
            assert(hasError);
        });
        it('Should return a four byte hex value (0x00000000) if alias is \'transparent\'', function() {
            assert.equal(colorConverter.fromAlias('transparent'), '0x00000000');
        })
    });
    describe('isRGB()', function () {
        it('Should return true if text has correct format (with spaces)', function () {
            assert.ok(colorConverter.isRGB('rgb(255, 15, 120)'));
        });
        it('Should return true if text has correct format (without spaces)', function () {
            assert.ok(colorConverter.isRGB('rgb(255,15,120)'));                
        });
        it('Should return true if text has correct format (with Upper Case)', function () {
            assert.ok(colorConverter.isRGB('RGB(255,15,120)'));                
        });
        it('Should return false if text does not start with RGB', function () {
            assert.ok(!colorConverter.isRGB('255,15,120'));
        });
        it('Should return false if text does not have the three channels', function () {
            assert.ok(!colorConverter.isRGB('rgb(255, 15)'));                                
        });
        it('Should return true if text is a RGBA color', function () {
            assert.ok(colorConverter.isRGB('rgba(255,15,120, 0.1)'));                                
        });            
    });
    describe('fromRGB()', function() {
        it('Should return a four byte hex value if RGB is valid', function () {
            assert.equal(colorConverter.fromRGB('rgb(0, 255, 0)'), '0xff00ff00');
        });
        it('Should return a four byte hex value if RGB without spaces is valid', function () {
            assert.equal(colorConverter.fromRGB('rgb(0,255,0)'), '0xff00ff00');
        });
        it('Should return a four byte hex value if RGBA is valid (alpha channel is decimal)', function () {
            assert.equal(colorConverter.fromRGB('rgba(0, 255, 0, 0.75)'), '0xbf00ff00');
        });
        it('Should return a four byte hex value if RGBA without spaces is valid (alpha channel is decimal)', function () {
            assert.equal(colorConverter.fromRGB('rgba(0,255,0,.75)'), '0xbf00ff00');
        });
        it('Should return a four byte hex value if RGBA is valid (alpha channel is int)', function () {
            assert.equal(colorConverter.fromRGB('rgba(0, 255, 0, 1)'), '0xff00ff00');
        });
        it('Should return a four byte hex value if RGBA without spaces is valid (alpha channel is int)', function () {
            assert.equal(colorConverter.fromRGB('rgba(0,255,0,1)'), '0xff00ff00');
        });
        it('Should return an error if RGB is not valid', function () {
            var hasError = false;
            try {
                colorConverter.fromRGB('rgb(lorem itsum)');
            } catch (error) {
                hasError = true;
            }
            assert(hasError);
        });
    });
    describe('isHSL()', function() {
        it('Should return true is the text format is hsl(###, #%, #%)', function () {
            assert.ok(colorConverter.isHSL('hsl(240, 100%, 50%)'));
        });
        it('Should return true is the text format is hsla(###, #%, #%, #.#)', function () {
            assert.ok(colorConverter.isHSL('hsla(240, 100%, 50%, 0.75)'));            
        });
        it('Should return true is the text format is hsla(###,#%,#%,#.#)', function () {
            assert.ok(colorConverter.isHSL('hsla(240,100%,50%,0.75)'));            
        });        
        it('Should return true is the text format is hsla(###, #%, #%, #)', function () {
            assert.ok(colorConverter.isHSL('hsla(240, 100%, 50%, 1)'));            
        });
        it('Should return false if the text forma is incorrect', function () {
            assert.ok(!colorConverter.isHSL('lorem itsum'));
        });
    });
    describe('fromHSL()', function() {
        it('Should return a four byte hex value if HSL is valid', function() {
            assert.equal(colorConverter.fromHSL('hsl(240, 100%, 50%)'), '0xff0000ff');
        });
        it('Should return a four byte hex value if HSLA is valid (alpha is decimal)', function () {
            assert.equal(colorConverter.fromHSL('hsla(240, 100%, 50%, 0.75)'), '0xbf0000ff');
        });
        it('Should return a four byte hex value if HSLA is valid (alpha is integer)', function () {
            assert.equal(colorConverter.fromHSL('hsla(240, 100%, 50%, 1)'), '0xff0000ff');
        });
        it('Should return an error if HSL is not valid', function (){
            var hasError = false;
            try {
                colorConverter.fromHSL('hsl(240, 100%)');
            } catch (error) {
                hasError = true;
            }
            assert(hasError);
        });
    });
    describe('toRGB', function () {
        it('Shoul return a four byte color if text is a valid alias', function () {
            assert.equal(colorConverter.toHexadecimal('blue'), '0xff0000ff');
        });
        it('Shoul return a four byte color if text is a valid hexadecimal', function() {
            assert.equal(colorConverter.toHexadecimal("#123456"), '0xff123456');            
        });
        it('Shoul return a four byte color if text is a valid RGB', function () {
            assert.equal(colorConverter.toHexadecimal('rgb(0, 255, 0)'), '0xff00ff00');
        });
        it('Shoul return a four byte color if text is a valid RGBA', function () {
            assert.equal(colorConverter.toHexadecimal('rgba(0,255,0,.75)'), '0xbf00ff00');            
        });
        it('Shoul return a four byte color if text is a valid HSL', function () {
            assert.equal(colorConverter.toHexadecimal('hsl(240, 100%, 50%)'), '0xff0000ff');
        });
        it('Shoul return a four byte color if text is a valid HSLA', function () {
            assert.equal(colorConverter.toHexadecimal('hsla(240, 100%, 50%, 0.75)'), '0xbf0000ff');
        });
        it('Shoul return null is text is not valid', function () {
            assert.equal(colorConverter.toHexadecimal('lorem itsum'), null);
        });                
    });
});