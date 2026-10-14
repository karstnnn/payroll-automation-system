
const fs = require("fs");
const os = require("os");
const path = require("path");

const historyService = require(
    "./services/payrollSummaryHistoryService"
);

// Use a temporary folder to avoid changing real delivery history.
const testFolder = fs.mkdtempSync(
    path.join(os.tmpdir(), "payroll-history-test-")
);

const month = "October 2026";
const recipient = "accountant@example.com";

try {

    console.log(
        "Before:",
        historyService.getDeliveryStatus(
            testFolder,
            month,
            recipient
        )
    );

    historyService.markDeliveryStatus(
        testFolder,
        month,
        recipient,
        "sending"
    );

    console.log(
        "During:",
        historyService.getDeliveryStatus(
            testFolder,
            month,
            recipient
        ).status
    );

    historyService.markDeliveryStatus(
        testFolder,
        month,
        recipient,
        "sent"
    );

    console.log(
        "After:",
        historyService.getDeliveryStatus(
            testFolder,
            month,
            recipient
        ).status
    );

} finally {

    fs.rmSync(
        testFolder,
        { recursive: true, force: true }
    );

}
