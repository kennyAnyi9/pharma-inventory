import { NextResponse } from 'next/server';
import { sendCriticalStockAlert, getEmailRecipients } from '@/lib/email-service';

export async function POST() {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Get email recipients
    const recipients = await getEmailRecipients();
    
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No email recipients found (admin/super_admin users)' },
        { status: 400 }
      );
    }

    // Test with sample critical stock data
    const testAlert = {
      drugName: 'Test Drug - Paracetamol 500mg',
      currentStock: 0,
      reorderLevel: 50,
      supplier: 'Test Supplier Ltd',
      drugId: 999,
    };

    // Send test email
    const result = await sendCriticalStockAlert(testAlert, recipients);

    return NextResponse.json({
      success: true,
      message: 'Test critical stock email sent successfully',
      recipients: recipients.map(r => ({ email: r.email, name: r.name })),
      emailResult: {
        successful: result.successful,
        failed: result.failed,
        details: result.results,
      },
      testData: testAlert,
      note: 'Check your spam folder and Resend dashboard for delivery status',
    });

  } catch (error) {
    console.error('❌ Test email error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to send test email',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json(
    { message: 'Use POST to send test critical stock email' },
    { status: 405 }
  );
}