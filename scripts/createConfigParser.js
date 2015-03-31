module.exports = function (xml, etree, ConfigParser) {
  var config = new ConfigParser(xml);

  // set the text for an element
  config.setElement = function (name, text) {
    if (text) {
      var el = this.doc.find(name);
      if (!el) {
        var root = this.doc.getroot();
        el = new etree.SubElement(root, name);
      }

      el.text = text;
    }
  };

  // TODO: replace this
  config.setAttribute = function (elname, attname, value) {
    if (value) {
      var el = this.doc.find(elname);
      if (!el) {
        var root = this.doc.getroot();
        el = new etree.SubElement(root, elname);
      }

      el.set(attname, value);
    }
  };

  // set the value of a "preference" element
  config.setPreference = function (name, value) {
    if (value) {
      var el = this.doc.find('preference[@name=\'' + name + '\']');
      if (!el) {
        var root = this.doc.getroot();
        el = new etree.SubElement(root, 'preference');
        el.set('name', name);
      }

      el.set('value', value);
    }
  };

  // get all elements with the specified name
  config.getElements = function (name) {
    return this.doc.findall(name);
  };

  // remove all elements from the document matching the specified XPath expression
  config.removeElements = function (path){
    var removeChilds = function (childs, elements) {
      for(var i=0; i < elements.length; i++){
        var idx = childs.indexOf(elements[i]);
        if(idx > -1){
          childs.splice(idx,1);
        }
      }

      childs.forEach(function (child) {
        removeChilds(child.getchildren(), elements);
      });
    }

    var elements = this.doc.findall(path);
    removeChilds(this.doc.getroot().getchildren(), elements);
  };

  return config;
}
