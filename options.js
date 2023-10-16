const defaultStyle = {
  borderWidth: "0.25rem",
  borderColor: "red",
  borderStyle: "dashed"
};

// the extension option rules
let rules = [];

/**
 * @description Add the given table row cell
 * @param {Element} row The table row element
 * @param {number} rowId The row index
 * @param {Object} col The column definition
 */
function addRowCell(row, rowId, col) {
  const { type, id, value, classname, options } = col;
  let newCell = document.createElement("td");
  let el;

  if ("textarea" === type) {
    el = document.createElement("textarea");
  } else if ("select" === type) {
    el = document.createElement("select");
  } else {
    el = document.createElement("input");
    el.type = type;
  }

  if ("checkbox" === type) {
    el.checked = value;
  } else {
    el.value = value;
  }

  if ("undefined" !== typeof id) {
    el.setAttribute("id", id + "-" + rowId);
  }

  if (classname) {
    el.setAttribute("class", classname);
  }

  if (options) {
    options.forEach((option, optionId) => {
      const _option = document.createElement("option");
      _option.value = option.value;
      _option.textContent = option.label;
      _option.selected = value === option.value;
      el.appendChild(_option);
    });
  }

  if ("button" === type) {
    // handle remove rule cell
    el.addEventListener("click", e => {
      delete rules[rowId];

      row.parentNode.removeChild(row);
    });
  } else {
    // handle changing rule value
    el.addEventListener("change", e => {
      const rule = rules[rowId];

      rule[id] = "checkbox" === type ? e.target.checked : e.target.value;

      if ("action" === id && "style" === e.target.value) {
        rule.style = defaultStyle;
      }
    });
  }

  newCell.appendChild(el);

  row.appendChild(newCell);
}

/**
 * @description Add a new row to the options rules table
 * @param {Array} cols The row columns
 * @param {number} rowId The row index
 */
function addTableRow(cols, rowId) {
  const tbody = document.querySelector("table#rules_table > tbody");
  let newRow = document.createElement("tr");

  cols.forEach(col => {
    addRowCell(newRow, rowId, col);
  });

  if (cols.length) {
    addRowCell(newRow, rowId, {
      type: "button",
      classname: "remove",
      value: "Remove"
    });
  }

  tbody.appendChild(newRow);
}

/**
 * @description Render a option rule
 * @param {Object} rule The rule object
 * @param {number} [ruleId=0] The rule index
 */
function renderRule(rule, ruleId = 0) {
  const cols = [
    { type: "checkbox", id: "enabled", value: rule.enabled },
    { type: "text", id: "description", value: rule.description },
    { type: "textarea", id: "selector", value: rule.selector },
    {
      type: "select",
      id: "action",
      options: [
        { value: "style", label: "Highlight element" },
        { value: "remove", label: "Remove element" },
        { value: "blur", label: "Blur element" }
      ],
      value: rule.action
    }
  ];

  addTableRow(cols, ruleId);

  document.getElementById("save_rules").classList.remove("d-none");
}

/**
 * @description Render the page options rules
 * @param {Array} rules
 */
function renderRules(rules) {
  rules.forEach((rule, key) => renderRule(rule, key));
}

/**
 * @description Load and page options then render the rules
 */
function loadOptions() {
  chrome.storage.sync.get("rules", obj => {
    if (!Array.isArray(obj.rules)) {
      rules = [];
    } else {
      rules = obj.rules;
    }

    renderRules(rules);
  });

  chrome.storage.sync.get("twitter_options", obj => {
    console.log(obj, Boolean(obj.twitter_options.enabled));

    document.getElementById("allow_twitter_video_download").checked = Boolean(
      obj.twitter_options.enabled
    );
  });

  document.getElementById("twitter_options").addEventListener("change", e => {
    const twitter_options = { enabled: e.target.checked };
    chrome.storage.sync.set({ twitter_options });

    // Sending a message to the background script
    chrome.runtime.sendMessage({
      command: "updateOptions",
      twitter_options
    });
  });
}

/**
 * @description Save options to browser storage
 */
function saveOptions() {
  chrome.storage.sync.set({ rules: rules.filter(Boolean) });
}

/////////////////////////////////////////////////////////////////////////////////

// handle loading options page
document.addEventListener("DOMContentLoaded", () => {
  loadOptions();
});

// handle add rule
document.getElementById("add_rule").addEventListener("click", e => {
  const tbody = document.querySelector("table#rules_table > tbody");

  const rule = {
    enabled: false,
    description: "",
    selector: "",
    action: "style",
    style: defaultStyle
  };

  renderRule(rule, rules.length);

  rules.push(rule);
});

// handle save rules
document
  .getElementById("save_rules")
  .addEventListener("click", e => saveOptions());
