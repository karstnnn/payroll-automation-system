const nodemailer = require('nodemailer');

async function verifyConnection(config) {
    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,

        auth: {
            user: config.smtp.user,
            pass: config.smtp.password
        }
    });

    await transporter.verify();
    
    console.log("SMTP connection verified successfully.");
}


async function send(employee) {

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    employee.emailSent = true;

}

module.exports = {
  send,
  verifyConnection
}
