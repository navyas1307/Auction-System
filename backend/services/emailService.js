const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendAuctionEndEmails = async (sellerEmail, bidderEmail, itemName, winningBid, winnerName, sellerName) => {
  try {
    // Email to seller
    const sellerMsg = {
      to: sellerEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Auction Ended - ${itemName}`,
      html: `
        <h2>Your Auction Has Ended!</h2>
        <p>Dear ${sellerName},</p>
        <p>Your auction for <strong>${itemName}</strong> has ended.</p>
        <p><strong>Winning Bid:</strong> $${winningBid}</p>
        <p><strong>Winner:</strong> ${winnerName}</p>
        <p><strong>Winner's Email:</strong> ${bidderEmail}</p>
        <p>Please contact the winner to complete the transaction.</p>
        <br>
        <p>Thank you for using our auction platform!</p>
      `
    };

    // Email to winning bidder
    const bidderMsg = {
      to: bidderEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `Congratulations! You Won - ${itemName}`,
      html: `
        <h2>Congratulations! You Won the Auction!</h2>
        <p>Dear ${winnerName},</p>
        <p>You have won the auction for <strong>${itemName}</strong>!</p>
        <p><strong>Your Winning Bid:</strong> $${winningBid}</p>
        <p><strong>Seller:</strong> ${sellerName}</p>
        <p><strong>Seller's Email:</strong> ${sellerEmail}</p>
        <p>The seller will contact you soon to complete the transaction.</p>
        <br>
        <p>Thank you for participating in our auction!</p>
      `
    };

    await sgMail.send(sellerMsg);
    await sgMail.send(bidderMsg);
    
    console.log('Auction end emails sent successfully');
  } catch (error) {
    console.error('Error sending emails:', error);
  }
};

module.exports = {
  sendAuctionEndEmails
};