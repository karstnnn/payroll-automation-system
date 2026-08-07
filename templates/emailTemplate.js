const dateUtils =
require("../utils/dateUtils");

const { getSignature } =
    require("./signature");

const subject =
dateUtils.getEmailSubject();

const currentDate = dateUtils.getCurrentDate();
const currentMonth = dateUtils.getCurrentMonth();
const nextWorkingDay = dateUtils.getNextWorkingDay(currentDate);

function create(employee, config) {

    return {

        subject: subject,

        html:
        `
        <div style="font-family: Aptos, Arial, sans-serif; font-size: 12pt;">
        <p>Dear ${employee.name},</p>

        <p>Please find attached your payslip for the month of ${currentMonth} for your reference.</p>

        <p>Kindly be advised that your salary will be credited to your designated bank account on ${nextWorkingDay}.</p>

        <p>Should you require any clarification, please do not hesitate to contact the undersigned.</p>


${getSignature()}

</div>

`
    };

}

module.exports = {
    create
};