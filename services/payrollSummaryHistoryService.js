
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function getHistoryPath(userDataPath) {
    return path.join(
        userDataPath,
        "history",
        "payroll-summary-deliveries.json"
    );
}

function getDeliveryKey(month, recipient) {

    if (!month || !recipient) {
        throw new Error(
            "Payroll month and recipient are required."
        );
    }

    return crypto
        .createHash("sha256")
        .update(
            JSON.stringify([
                "payroll-summary",
                month,
                recipient.trim().toLowerCase()
            ])
        )
        .digest("hex");
}

function loadHistory(userDataPath) {

    const historyPath = getHistoryPath(userDataPath);

    if (!fs.existsSync(historyPath)) {
        return {};
    }

    const history = JSON.parse(
        fs.readFileSync(historyPath, "utf8")
    );

    if (
        !history ||
        typeof history !== "object" ||
        Array.isArray(history)
    ) {
        throw new Error(
            "Invalid payroll summary delivery history."
        );
    }

    return history;
}

function getDeliveryStatus(
    userDataPath,
    month,
    recipient
) {

    const history = loadHistory(userDataPath);
    const key = getDeliveryKey(month, recipient);

    return history[key] || null;
}

function markDeliveryStatus(
    userDataPath,
    month,
    recipient,
    status
) {

    const allowedStatuses = [
        "sending",
        "sent",
        "needs-review"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error(
            "Invalid payroll summary delivery status."
        );
    }

    const historyPath = getHistoryPath(userDataPath);
    const history = loadHistory(userDataPath);

    const key = getDeliveryKey(month, recipient);

    history[key] = {
        month,
        recipient: recipient.trim().toLowerCase(),
        status,
        updatedAt: new Date().toISOString()
    };

    fs.mkdirSync(
        path.dirname(historyPath),
        { recursive: true }
    );

    const tempPath = historyPath + ".tmp";

    fs.writeFileSync(
        tempPath,
        JSON.stringify(history, null, 2),
        "utf8"
    );

    fs.renameSync(tempPath, historyPath);

    return history[key];
}

module.exports = {
    getDeliveryStatus,
    markDeliveryStatus
};
