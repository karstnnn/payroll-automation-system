function create(employee, config) {

    return {

        subject: config.emailSubject,

        text:
        `Dear ${employee.name},

        Please find attached your payslip for the month of July 2026 for your reference.
        Kindly be advised that your salary will be credited to your designated bank account on 24 July  2026.
        Should you require any clarification, please do not hesitate to contact the undersigned.`
        
    };

}

module.exports = {
    create
};