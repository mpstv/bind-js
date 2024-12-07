const keyUp = "keyup";

export function bind(templateId, object) {
  const template = getTemplateById(templateId);

  const propertiesNodesDict = getPropertyAndNodesDict(object, template);

  const proxy = createProxy(propertiesNodesDict, object);

  const nodesAndListeners = createInputKeyUpListeners(
    propertiesNodesDict,
    proxy
  );

  initDefaultValues(propertiesNodesDict, proxy);

  return {
    proxy,
    destroy: () => {
      nodesAndListeners.forEach(({ node, listener }) =>
        node.removeEventListener(keyUp, listener)
      );
    },
  };
}

function getTemplateById(templateId) {
  const template = document.getElementById(templateId);

  if (!template) {
    throw new Error("Not found html template with id: ", templateId);
  }

  return template;
}

function getPropertyAndNodesDict(object, template) {
  return Object.keys(object).reduce((acc, property) => {
    const nodes = template.querySelectorAll(`[data-bind=${property}]`);

    if (nodes?.length) {
      acc[property] = nodes;
    }

    return acc;
  }, {});
}

function createProxy(propertiesNodesDict, object) {
  const proxy = {
    set(obj, prop, value) {
      updateHtml(propertiesNodesDict, prop, value);

      if (!isFunction(obj[prop])) {
        Reflect.set(...arguments);
        calcAllFuctions(obj, propertiesNodesDict);
      }

      return true;
    },
  };

  return new Proxy(object, proxy);
}

function calcAllFuctions(obj, propertiesNodesDict) {
  Object.entries(obj)
    .filter(([_, value]) => isFunction(value))
    .forEach(([key, value]) => {
      updateHtml(propertiesNodesDict, key, value.bind(obj)());
    });
}

function updateHtml(propertiesNodesDict, prop, value) {
  if (propertiesNodesDict[prop]) {
    propertiesNodesDict[prop].forEach((node) => {
      if (isInput(node)) {
        if (node.value !== value) {
          node.value = value;
        }

        return;
      }

      node.innerText = value;
    });
  }
}

function createInputKeyUpListeners(propertiesNodesDict, proxy) {
  return Object.entries(propertiesNodesDict).reduce(
    (acc, [property, nodes]) => {
      nodes.forEach((node) => {
        if (isInput(node)) {
          const listener = () => {
            proxy[property] = node.value;
          };

          node.addEventListener(keyUp, listener);

          acc.push({ node, listener });
        }
      });

      return acc;
    },
    []
  );
}

function initDefaultValues(propertiesNodesDict, proxy) {
  Object.keys(propertiesNodesDict).forEach((property) => {
    if (!isFunction(proxy[property])) {
      proxy[property] = proxy[property];
    }
  });
}

function isFunction(value) {
  return typeof value === "function";
}

function isInput(node) {
  return node.nodeName === "INPUT";
}
