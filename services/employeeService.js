const fs = require("fs");

async function loadEmployees(appsScriptUrl) {
    const response =
        await fetch(
            appsScriptUrl +
            "?action=employees"
        );

    return await response.json();
}

module.exports = {
    loadEmployees
};
