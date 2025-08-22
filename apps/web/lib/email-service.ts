import { Resend } from 'resend';

// Initialize Resend only when API key is available
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
};

export interface CriticalStockAlert {
  drugName: string;
  currentStock: number;
  reorderLevel: number;
  supplier?: string;
  drugId: number;
}

export interface EmailRecipient {
  email: string;
  name: string;
}

export async function sendCriticalStockAlert(
  alert: CriticalStockAlert,
  recipients: EmailRecipient[]
) {
  try {
    const resend = getResendClient();
    const subject = `🚨 Critical Stock Alert: ${alert.drugName}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Critical Stock Alert</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🚨 Critical Stock Alert</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">Immediate action required</p>
          </div>
          
          <div style="background: #fff; border: 1px solid #e5e7eb; padding: 24px; border-radius: 0 0 8px 8px;">
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <h2 style="margin: 0 0 12px 0; color: #dc2626; font-size: 20px;">${alert.drugName}</h2>
              <p style="margin: 0; color: #991b1b; font-weight: 500;">Stock level critically low!</p>
            </div>
            
            <div style="background: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
              <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">Stock Details</h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 500;">Current Stock:</span>
                  <span style="color: #dc2626; font-weight: 600;">${alert.currentStock} units</span>
                </li>
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e5e7eb;">
                  <span style="font-weight: 500;">Reorder Level:</span>
                  <span>${alert.reorderLevel} units</span>
                </li>
                ${alert.supplier ? `
                <li style="display: flex; justify-content: space-between; padding: 4px 0;">
                  <span style="font-weight: 500;">Supplier:</span>
                  <span>${alert.supplier}</span>
                </li>
                ` : ''}
              </ul>
            </div>
            
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/inventory" 
                 style="background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                View Inventory & Reorder Now
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; color: #6b7280; font-size: 14px;">
              <p style="margin: 0;">This alert was generated automatically by your Pharma Inventory System.</p>
              <p style="margin: 4px 0 0 0;">Time: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
🚨 CRITICAL STOCK ALERT 🚨

Drug: ${alert.drugName}
Current Stock: ${alert.currentStock} units
Reorder Level: ${alert.reorderLevel} units
${alert.supplier ? `Supplier: ${alert.supplier}` : ''}

IMMEDIATE ACTION REQUIRED: This drug has reached critically low stock levels.

View inventory and reorder: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/inventory

Generated: ${new Date().toLocaleString()}
    `;

    const results = await Promise.allSettled(
      recipients.map(recipient =>
resend.emails.send({
          from: 'Pharma Inventory <onboarding@resend.dev>',
          to: recipient.email,
          subject,
          html: htmlContent,
          text: textContent,
        })
      )
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    // Log detailed results for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`📧 Email failed for ${recipients[index]?.email}:`, result.reason);
      } else {
        console.log(`📧 Email sent successfully to ${recipients[index]?.email}:`, result.value);
      }
    });

    console.log(`📧 Critical stock alert sent: ${successful} successful, ${failed} failed`);

    return {
      success: successful > 0,
      successful,
      failed,
      results
    };

  } catch (error) {
    console.error('❌ Failed to send critical stock alert:', error);
    throw new Error(`Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getEmailRecipients(): Promise<EmailRecipient[]> {
  try {
    // Hardcoded email recipient
    const hardcodedRecipients: EmailRecipient[] = [
      {
        email: 'kennyanyi9@gmail.com',
        name: 'Kenny Anyi'
      }
    ];

    // Also get admin users from database as backup
    const { db } = await import('./db');
    const { users } = await import('@workspace/database');
    const { eq, or } = await import('drizzle-orm');

    const adminUsers = await db
      .select({
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(or(eq(users.role, 'admin'), eq(users.role, 'super_admin')));

    // Combine hardcoded and database users, removing duplicates
    const allRecipients = [...hardcodedRecipients, ...adminUsers];
    const uniqueRecipients = allRecipients.filter((recipient, index, self) => 
      index === self.findIndex(r => r.email === recipient.email)
    );

    return uniqueRecipients;
  } catch (error) {
    console.error('❌ Failed to get email recipients:', error);
    // Return hardcoded email as fallback
    return [
      {
        email: 'kennyanyi9@gmail.com',
        name: 'Kenny Anyi'
      }
    ];
  }
}