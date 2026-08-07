const dateUtils =
require("../utils/dateUtils");

const subject =
dateUtils.getEmailSubject();

const currentDate = dateUtils.getCurrentDate();
const currentMonth = dateUtils.getCurrentMonth();
const nextWorkingDay = dateUtils.getNextWorkingDay(currentDate);

function create(employee, config) {

    return {

        subject: subject,

        text:
        `Dear ${employee.name},

Please find attached your payslip for the month of ${currentMonth} for your reference.

Kindly be advised that your salary will be credited to your designated bank account on ${nextWorkingDay}.

Should you require any clarification, please do not hesitate to contact the undersigned.`
        
    };

}

module.exports = {
    create
};