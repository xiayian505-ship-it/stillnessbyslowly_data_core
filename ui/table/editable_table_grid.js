/* 慢慢的倉庫｜UI / Table｜Editable Table Grid v1.0.0
   建立一組可編輯標題＋表格的 DOM。
   支援多表格、列數、欄數、可選欄寬、版面欄數與 activate callback。
   不處理儲存、字體工具、PNG/PDF、商業資料。
*/
(function (global) {
  "use strict";

  const VERSION = "1.0.0";

  function positiveInteger(value, name) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
      throw new RangeError(name + " must be a positive integer.");
    }
    return number;
  }

  function normalizeWidths(widths, columns) {
    if (widths == null) return null;

    if (!Array.isArray(widths) || widths.length !== columns) {
      throw new RangeError(
        "columnWidths must contain one value per column."
      );
    }

    const result = widths.map((value, index) => {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) {
        throw new RangeError(
          "columnWidths[" + index + "] must be > 0."
        );
      }
      return number;
    });

    return Object.freeze(result);
  }

  function render(container, options = {}) {
    if (!container || typeof container.appendChild !== "function") {
      throw new TypeError("container must be a DOM element.");
    }

    const doc = container.ownerDocument || global.document;
    const tableCount = positiveInteger(
      options.tableCount ?? 1,
      "tableCount"
    );
    const rows = positiveInteger(
      options.rows ?? 1,
      "rows"
    );
    const columns = positiveInteger(
      options.columns ?? 1,
      "columns"
    );
    const layoutColumns = positiveInteger(
      options.layoutColumns ?? 1,
      "layoutColumns"
    );
    const columnWidths = normalizeWidths(
      options.columnWidths,
      columns
    );

    const prefix = String(
      options.classPrefix || "editable-table-grid"
    );

    const titleFactory =
      typeof options.titleFactory === "function"
        ? options.titleFactory
        : index => "表格 " + (index + 1);

    const onActivate =
      typeof options.onActivate === "function"
        ? options.onActivate
        : null;

    container.innerHTML = "";
    container.style.gridTemplateColumns =
      "repeat(" + layoutColumns + ", minmax(0, 1fr))";

    const wrappers = [];
    const titles = [];
    const cells = [];

    for (let tableIndex = 0; tableIndex < tableCount; tableIndex += 1) {
      const wrapper = doc.createElement("div");
      wrapper.className = prefix + "__wrapper";
      wrapper.dataset.tableIndex = String(tableIndex);

      const title = doc.createElement("div");
      title.className = prefix + "__title";
      title.contentEditable = "true";
      title.textContent = String(titleFactory(tableIndex));

      title.addEventListener("click", function () {
        onActivate?.({
          type: "title",
          element: title,
          tableIndex
        });
      });

      wrapper.appendChild(title);

      const table = doc.createElement("table");
      table.className = prefix + "__table";

      if (columnWidths) {
        const colgroup = doc.createElement("colgroup");

        columnWidths.forEach(function (width) {
          const col = doc.createElement("col");
          col.style.width = width + "%";
          colgroup.appendChild(col);
        });

        table.appendChild(colgroup);
      }

      const tbody = doc.createElement("tbody");

      for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        const tr = doc.createElement("tr");

        for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
          const td = doc.createElement("td");
          td.contentEditable = "true";
          td.dataset.tableIndex = String(tableIndex);
          td.dataset.rowIndex = String(rowIndex);
          td.dataset.columnIndex = String(columnIndex);

          td.addEventListener("click", function () {
            onActivate?.({
              type: "cell",
              element: td,
              tableIndex,
              rowIndex,
              columnIndex
            });
          });

          tr.appendChild(td);
          cells.push(td);
        }

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      wrapper.appendChild(table);
      container.appendChild(wrapper);

      wrappers.push(wrapper);
      titles.push(title);
    }

    return Object.freeze({
      wrappers: Object.freeze(wrappers.slice()),
      titles: Object.freeze(titles.slice()),
      cells: Object.freeze(cells.slice())
    });
  }

  global.EditableTableGrid = Object.freeze({
    version: VERSION,
    render
  });

})(typeof window !== "undefined" ? window : globalThis);
