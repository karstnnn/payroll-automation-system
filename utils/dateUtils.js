const dayjs = require("dayjs");

function getCurrentYear() {
    return dayjs().format("YYYY");
}

function getCurrentMonth() {
    return dayjs().format("MMMM YYYY");
}

function getCurrentDate() {
    return dayjs().format("D MMMM YYYY");
}

function isWeekend(date) {
  const dayOfWeek = dayjs(date).day();

  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getNextWorkingDay(date) {
  let day = dayjs(date).add(1, "day");

  while (isWeekend(day)) {
      day = day.add(1, "day");
  }

  return day.format("D MMMM YYYY");
}

function getEmailSubject() {
    return `Pay Slip - ${getCurrentMonth()}`;
}

function getPdfFolder(rootFolder) {
    return `${rootFolder}/${getCurrentYear()}/${getCurrentMonth()}`;
}

module.exports = {
    getCurrentYear,
    getCurrentMonth,
    getCurrentDate,
    getNextWorkingDay,
    isWeekend,
    getEmailSubject,
    getPdfFolder
};