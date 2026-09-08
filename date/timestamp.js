(function(global){
  "use strict";

  function pad2(value){
    return String(value).padStart(2, "0");
  }

  function pad3(value){
    return String(value).padStart(3, "0");
  }

  function normalizeDateInput(value){
    if(value === undefined){
      return new Date();
    }

    if(value instanceof Date){
      return Number.isNaN(value.getTime()) ? null : value;
    }

    if(typeof value === "number" || typeof value === "string"){
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  function create(value){
    const date = normalizeDateInput(value);
    if(!date) return "";

    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    const second = pad2(date.getSeconds());
    const millisecond = pad3(date.getMilliseconds());

    return `${year}${month}${day}${hour}${minute}${second}${millisecond}`;
  }

  global.Timestamp = {
    create
  };

})(typeof window !== "undefined" ? window : globalThis);
