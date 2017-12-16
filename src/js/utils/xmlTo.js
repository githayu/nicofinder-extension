export default function xmlChildrenParser(collections) {
  var currentData = {};

  for (let children of collections) {
    let attributes = {};

    // 属性
    if (children.attributes.length) {
      for (let attribute of children.attributes) {
        let value = this.isDecimalNumber(attribute.value) ? Number(attribute.value) : attribute.value;
        attributes[attribute.name] = value;
      }
    }

    // 子要素
    if (children.children.length) {
      let deepData = Object.assign({}, this.xmlChildrenParser(children.children), attributes);

      // 複数の同名タグが存在
      if (Array.from(collections).filter(element => element.tagName === children.tagName).length > 1) {
        if (children.tagName in currentData === false) currentData[children.tagName] = [];
        currentData[children.tagName].push(deepData);
      } else {
        currentData[children.tagName] = Object.assign({}, currentData[children.tagName], deepData);
      }
    } else {
      let value = this.isDecimalNumber(children.innerHTML) ? Number(children.innerHTML) : children.innerHTML;
      currentData[children.tagName] = value;
    }
  }

  return currentData;
}