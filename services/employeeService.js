const fs = require("fs");

async function loadEmployees(employeeFile) {
    const response =
        await fetch(
            process.env.APPS_SCRIPT_URL +
            "?action=employees"
        );

    return await response.json();
}

module.exports = {
    loadEmployees
};
