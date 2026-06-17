export interface EmailTemplate {
  subject: string;
  html: string;
}

export function paymentSuccessEmail(userName: string, transactionId: string, amount: number, currency: string): EmailTemplate {
  return {
    subject: 'Payment Successful - Nova Podcast',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Successful</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background-color: #f9f9f9; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00ff00; }
          .content { background-color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .button { display: inline-block; background-color: #00ff00; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
          .receipt-box { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .receipt-item { display: flex; justify-content: space-between; margin: 10px 0; }
          .label { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nova Podcast</div>
            <h1>Payment Successful</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>Thank you for your payment! Your Nova Podcast subscription has been successfully processed.</p>
            <div class="receipt-box">
              <div class="receipt-item">
                <span class="label">Transaction ID:</span>
                <span>${transactionId}</span>
              </div>
              <div class="receipt-item">
                <span class="label">Amount:</span>
                <span>${amount} ${currency}</span>
              </div>
              <div class="receipt-item">
                <span class="label">Date:</span>
                <span>${new Date().toLocaleDateString()}</span>
              </div>
            </div>
            <p>You can now enjoy all the benefits of your subscription.</p>
            <p style="text-align: center;">
              <a href="https://nova.co.rw/receipts/${transactionId}" class="button">View Receipt</a>
            </p>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact us at support@nova.co.rw</p>
            <p>&copy; ${new Date().getFullYear()} Nova Podcast. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function paymentFailedEmail(userName: string, transactionId: string, amount: number, currency: string, reason?: string): EmailTemplate {
  return {
    subject: 'Payment Failed - Nova Podcast',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background-color: #f9f9f9; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00ff00; }
          .content { background-color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .button { display: inline-block; background-color: #00ff00; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
          .error-box { background-color: #ffeeee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff0000; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nova Podcast</div>
            <h1>Payment Failed</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <p>We were unable to process your payment. This could be due to insufficient funds, an expired card, or a temporary issue with your payment method.</p>
            <div class="error-box">
              <p><strong>Transaction ID:</strong> ${transactionId}</p>
              <p><strong>Amount:</strong> ${amount} ${currency}</p>
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p>Please try again or use a different payment method.</p>
            <p style="text-align: center;">
              <a href="https://nova.co.rw/pricing" class="button">Try Again</a>
            </p>
          </div>
          <div class="footer">
            <p>If you continue to experience issues, please contact us at support@nova.co.rw</p>
            <p>&copy; ${new Date().getFullYear()} Nova Podcast. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function subscriptionExpiringEmail(userName: string, daysUntilExpiry: number): EmailTemplate {
  return {
    subject: `Your Subscription Expires in ${daysUntilExpiry} Day${daysUntilExpiry > 1 ? 's' : ''}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Expiring Soon</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background-color: #f9f9f9; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00ff00; }
          .content { background-color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .button { display: inline-block; background-color: #00ff00; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
          .warning-box { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nova Podcast</div>
            <h1>Subscription Expiring Soon</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <div class="warning-box">
              <p>Your Nova Podcast subscription will expire in <strong>${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}</strong>.</p>
            </div>
            <p>Don't lose access to your favorite podcasts! Renew now to continue enjoying uninterrupted listening.</p>
            <p style="text-align: center;">
              <a href="https://nova.co.rw/pricing" class="button">Renew Now</a>
            </p>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact us at support@nova.co.rw</p>
            <p>&copy; ${new Date().getFullYear()} Nova Podcast. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}

export function subscriptionRenewedEmail(userName: string, expiryDate: Date): EmailTemplate {
  return {
    subject: 'Subscription Renewed - Nova Podcast',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Renewed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .container { background-color: #f9f9f9; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #00ff00; }
          .content { background-color: #fff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; }
          .success-box { background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Nova Podcast</div>
            <h1>Subscription Renewed</h1>
          </div>
          <div class="content">
            <p>Hi ${userName || 'there'},</p>
            <div class="success-box">
              <p>Your Nova Podcast subscription has been successfully renewed!</p>
              <p><strong>New expiry date:</strong> ${expiryDate.toLocaleDateString()}</p>
            </div>
            <p>Thank you for your continued support. Enjoy uninterrupted access to all your favorite podcasts.</p>
          </div>
          <div class="footer">
            <p>If you have any questions, please contact us at support@nova.co.rw</p>
            <p>&copy; ${new Date().getFullYear()} Nova Podcast. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
}
